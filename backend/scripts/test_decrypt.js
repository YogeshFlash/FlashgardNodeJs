function convertHexToString(hexInput, encoding) {
    try {
        const bytes = Buffer.from(hexInput, 'hex');
        return bytes.toString(encoding);
    } catch (e) {
        return null;
    }
}

function getDecryptedModel(filecontent) {
    // Step 1: Hex to ASCII (Result is another hex string)
    const step1 = convertHexToString(filecontent, 'ascii');
    if (!step1) return null;
    // Step 2: Hex to UTF-16LE (Unicode)
    const step2 = convertHexToString(step1, 'utf16le');
    return step2;
}

// "IN;PA;PU" in UTF-16LE is [49 00 4E 00 3B 00 50 00 41 00 3B 00 50 00 55 00]
// Hex representation: "49004E003B00500041003B0050005500"
// ASCII hex for that string: 
// 4=34, 9=39, 0=30, 0=30, 4=34, E=45, 0=30, 0=30 ...
const testInput = "3439303034453030334230303530303034313030334230303530303035353030";

console.log('Decrypted:', getDecryptedModel(testInput));
