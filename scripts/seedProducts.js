// Database seeding script for Unsquashable products
// Run: node scripts/seedProducts.js

const { MongoClient } = require('mongodb');
const { unsquashableProducts, bundleDeals } = require('../src/data/productsUnsquashable');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/racketpoint';

async function seedDatabase() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');
    
    const db = client.db('racketpoint');
    const productsCollection = db.collection('products');
    
    // Clear existing products
    await productsCollection.deleteMany({});
    console.log('✓ Cleared existing products');
    
    // Insert Unsquashable rackets
    const result = await productsCollection.insertMany(unsquashableProducts);
    console.log(`✓ Inserted ${result.insertedCount} Unsquashable rackets`);
    
    // Create indexes for fast queries
    await productsCollection.createIndex({ sku: 1 }, { unique: true });
    await productsCollection.createIndex({ categorySlug: 1 });
    await productsCollection.createIndex({ brand: 1 });
    console.log('✓ Created database indexes');
    
    // Log summary
    console.log('\n📊 Product Catalog Summary:');
    const stats = await productsCollection.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgPrice: { $avg: '$priceBgn' },
          minPrice: { $min: '$priceBgn' },
          maxPrice: { $max: '$priceBgn' }
        }
      }
    ]).toArray();
    
    stats.forEach(stat => {
      console.log(`  ${stat._id}:`);
      console.log(`    Count: ${stat.count}`);
      console.log(`    Price Range: ${stat.minPrice.toFixed(0)} - ${stat.maxPrice.toFixed(0)} BGN`);
      console.log(`    Average: ${stat.avgPrice.toFixed(0)} BGN`);
    });
    
    console.log('\n✅ Database seeding complete!');
    
  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedDatabase();
