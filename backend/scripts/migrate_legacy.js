const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const ENCRYPTION_KEY = 'flashgard-secure-plt-data-key-32'; 
const IV_LENGTH = 16;

function encrypt(data) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    const encrypted = Buffer.concat([cipher.update(Buffer.from(data, 'utf8')), cipher.final()]);
    return Buffer.concat([iv, encrypted]);
}

function convertHexToString(hexInput, encoding) {
    try {
        const bytes = Buffer.from(hexInput, 'hex');
        return bytes.toString(encoding);
    } catch (e) { return null; }
}

function getDecryptedModel(filecontent) {
    const step1 = convertHexToString(filecontent, 'ascii');
    if (!step1) return null;
    const step2 = convertHexToString(step1, 'utf16le');
    return step2;
}

function parseCSVLine(line) {
    const result = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            result.push(cur);
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cur);
    return result;
}

function parseCSV(filePath, hasHeaders) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    
    let headers = [];
    let startIdx = 0;
    if (hasHeaders) {
        headers = parseCSVLine(lines[0]).map(h => h.trim());
        startIdx = 1;
    }

    return lines.slice(startIdx).map(line => {
        const values = parseCSVLine(line);
        const obj = {};
        if (hasHeaders) {
            headers.forEach((h, i) => { obj[h] = values[i] ? values[i].trim() : null; });
        } else {
            values.forEach((v, i) => { obj[i] = v ? v.trim() : null; });
        }
        return obj;
    });
}

async function migrate() {
    const basePath = 'd:/Projects/Flashgard2.0/Flashgard_2/Flashgard/mobile/android/app/libs/DatatoMigrate';
    const catalogFile = path.join(basePath, 'CatalogueMaster.csv');
    const modelFile = path.join(basePath, 'ModelMaster.csv');

    console.log('Loading CatalogueMaster...');
    const catalogData = parseCSV(catalogFile, true);
    const catalogMap = {};
    catalogData.forEach(item => {
        catalogMap[item.CatalogID] = item;
    });

    console.log('Loading ModelMaster...');
    const modelData = parseCSV(modelFile, false);

    console.log('Building Caches...');
    const categoryMap = {}; // name -> id
    const brandMap = {}; // categoryId:brandName -> id
    const modelMap = {}; // brandId:modelName -> id
    const catalogToModelDbId = {}; // catalogID -> modelDbId

    // 1. Process Categories (ParentID = 1)
    const categoryNodes = catalogData.filter(d => d.ParentID == '1');
    for (const node of categoryNodes) {
        const name = node.Name;
        let dt = await prisma.modelCategory.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
        if (!dt) {
            dt = await prisma.modelCategory.create({ data: { name } });
            console.log(`Created Category: ${name}`);
        }
        categoryMap[node.CatalogID] = dt.id;
    }

    // 2. Process Brands (Children of Categories)
    const brandNodes = catalogData.filter(d => categoryMap[d.ParentID]);
    for (const node of brandNodes) {
        const name = node.Name;
        const categoryId = categoryMap[node.ParentID];
        
        let brand = await prisma.brand.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
        if (!brand) {
            brand = await prisma.brand.create({ data: { name } });
            console.log(`Created Brand: ${name}`);
        }
        brandMap[node.CatalogID] = brand.id;
    }

    // 3. Process Models (FileType = 3)
    const modelNodes = catalogData.filter(d => d.FileType == '3');
    console.log(`Importing ${modelNodes.length} models...`);
    let mCount = 0;
    for (const node of modelNodes) {
        const brandId = brandMap[node.ParentID];
        if (!brandId) continue;

        // Find categoryId from the brand's parent in CatalogueMaster
        const brandNode = catalogMap[node.ParentID];
        const categoryId = categoryMap[brandNode.ParentID];

        if (!categoryId) continue;

        let model = await prisma.model.findFirst({ 
            where: { name: node.Name, brandId, categoryId } 
        });
        if (!model) {
            model = await prisma.model.create({
                data: {
                    name: node.Name,
                    brandId,
                    categoryId,
                    imageUrl: node.ImageUrl && node.ImageUrl !== 'NULL' ? `/uploads/legacy/${node.ImageUrl}` : null
                }
            });
        }
        catalogToModelDbId[node.CatalogID] = model.id;
        mCount++;
        if (mCount % 500 === 0) console.log(`Imported ${mCount} models...`);
    }

    // 4. Process Cut Files from ModelMaster
    console.log(`Processing ${modelData.length} cut files...`);
    const cutTypeCache = {};
    const existingCutTypes = await prisma.cutType.findMany();
    existingCutTypes.forEach(ct => cutTypeCache[ct.name.toLowerCase()] = ct.id);

    let cCount = 0;
    for (const row of modelData) {
        // 0:ModelID, 1:Name, 2:RefName, 4:Instruction, 5:CatalogID
        const catalogID = row[5];
        const modelId = catalogToModelDbId[catalogID];
        if (!modelId) continue;

        const cutTypeName = row[1] || 'Standard Cut';
        let cutTypeId = cutTypeCache[cutTypeName.toLowerCase()];
        if (!cutTypeId) {
            const ct = await prisma.cutType.create({ data: { name: cutTypeName, description: row[2] } });
            cutTypeId = ct.id;
            cutTypeCache[cutTypeName.toLowerCase()] = cutTypeId;
        }

        const instructionHex = row[4];
        const decryptedPlt = getDecryptedModel(instructionHex);
        if (!decryptedPlt) continue;

        const encryptedPlt = encrypt(decryptedPlt);

        const existing = await prisma.modelCutFile.findFirst({
            where: { modelId, cutTypeId }
        });

        if (!existing) {
            await prisma.modelCutFile.create({
                data: {
                    modelId,
                    cutTypeId,
                    encryptedPltData: encryptedPlt
                }
            });
            cCount++;
        }
    }

    console.log(`Migration complete! Imported ${mCount} models and ${cCount} cut files.`);
}

migrate()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
