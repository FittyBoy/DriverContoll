require('dotenv').config();
const { query } = require('./db');

async function test() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check car_types
    const types = await query('SELECT * FROM mass.car_types');
    console.log('\n✅ Car Types:', types.length, 'found');
    types.forEach(t => console.log(`  - ${t.id}: ${t.icon} ${t.name}`));
    
    // Test 2: Check cars
    const cars = await query(`
      SELECT c.id, c.name, c.car_type_id, ct.name as type_name 
      FROM mass.cars c 
      JOIN mass.car_types ct ON ct.id = c.car_type_id
    `);
    console.log('\n✅ Cars:', cars.length, 'found');
    cars.forEach(c => console.log(`  - ${c.id}: ${c.name} (Type: ${c.type_name})`));
    
    // Test 3: Check with API format
    const carsAPI = await query(`
      SELECT c.id, c.name, c.car_type_id AS "carTypeId", c.seats, c.available, c.description,
             ct.name AS "typeName", ct.icon AS "typeIcon"
      FROM mass.cars c
      JOIN mass.car_types ct ON ct.id = c.car_type_id
      ORDER BY c.id
    `);
    console.log('\n✅ Cars (API Format):', carsAPI.length, 'found');
    console.log(JSON.stringify(carsAPI, null, 2));
    
  } catch (e) {
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
  process.exit(0);
}

test();
