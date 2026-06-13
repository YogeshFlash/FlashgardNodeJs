const sql = require('mssql');

const passwords = [
  'sa',
  'sa123',
  'sa@123',
  'sa@2026',
  'sa@2025',
  'sa@1234',
  'Password@123',
  'Flashgard@2026',
  'sa@12345'
];

async function tryConnect(password) {
  const config = {
    user: 'sa',
    password: password,
    server: 'localhost',
    database: 'master', // Start with master database first
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true
    },
    requestTimeout: 5000
  };

  try {
    const pool = await sql.connect(config);
    console.log(`Successfully connected using password: ${password}`);
    return pool;
  } catch (err) {
    // console.log(`Failed for password ${password}: ${err.message}`);
    return null;
  }
}

async function run() {
  let pool = null;
  for (const pw of passwords) {
    pool = await tryConnect(pw);
    if (pool) break;
  }

  if (!pool) {
    // Try to see if there is another database name we can connect to using windows auth?
    // Wait, let's try trusted connection (Windows authentication)
    const winConfig = {
      server: 'localhost',
      database: 'master',
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true
      },
      // Note: node-mssql doesn't always support trusted connection easily without domain/user,
      // but let's try if it works
    };
    try {
      pool = await sql.connect(winConfig);
      console.log('Connected using Windows Authentication');
    } catch (e) {
      console.log('Failed Windows Authentication:', e.message);
    }
  }

  if (!pool) {
    console.log('Could not connect to SQL Server.');
    process.exit(1);
  }

  try {
    // 1. Find the database names
    const dbsRes = await pool.request().query("SELECT name FROM sys.databases WHERE database_id > 4");
    const dbs = dbsRes.recordset.map(r => r.name);
    console.log('Databases:', dbs);

    // Let's connect to the first non-system database or one that looks like Flashgard
    const targetDb = dbs.find(d => d.toLowerCase().includes('flash') || d.toLowerCase().includes('gard') || d.toLowerCase().includes('scratch')) || dbs[0];
    if (targetDb) {
      console.log(`Connecting to database: ${targetDb}`);
      await pool.close();
      const dbConfig = {
        user: 'sa',
        password: pool.config.password,
        server: 'localhost',
        database: targetDb,
        port: 1433,
        options: {
          encrypt: false,
          trustServerCertificate: true
        }
      };
      const dbPool = await sql.connect(dbConfig);
      
      const tablesRes = await dbPool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
      console.log('Tables in', targetDb, ':', tablesRes.recordset.map(r => r.TABLE_NAME));

      const targetTables = ['ProductTypeMaster', 'MaterialMaster', 'MaterialCutTypeConfig'];
      for (const t of targetTables) {
        const columnsRes = await dbPool.request().query(`
          SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${t}'
          ORDER BY ORDINAL_POSITION
        `);
        console.log(`\nColumns for ${t}:`);
        columnsRes.recordset.forEach(c => {
          console.log(` - ${c.COLUMN_NAME} (${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? '(' + c.CHARACTER_MAXIMUM_LENGTH + ')' : ''}) - Nullable: ${c.IS_NULLABLE}`);
        });

        // Let's print a sample row
        try {
          const sampleRes = await dbPool.request().query(`SELECT TOP 2 * FROM [${t}]`);
          console.log(`Sample data for ${t}:`, sampleRes.recordset);
        } catch (sampleErr) {
          console.log(`Could not fetch sample data for ${t}:`, sampleErr.message);
        }
      }
      await dbPool.close();
    }
  } catch (err) {
    console.error('Error querying schema:', err);
  } finally {
    if (pool && pool.connected) await pool.close();
  }
}

run();
