const fs = require('fs');
const csv = require('csv-parser');

const testData = `Campaign,Impressions,Clicks,Conversions,Spend,Revenue
Google_Ads,50000,2500,150,25000,90000
Facebook,45000,2200,120,20000,72000
Instagram,38000,1900,100,18000,60000
LinkedIn,28000,1400,80,15000,48000
Twitter,35000,1750,95,17000,57000`;

fs.writeFileSync('test.csv', testData);

const results = [];
fs.createReadStream('test.csv')
  .pipe(csv())
  .on('data', (data) => results.push(data))
  .on('end', () => {
    console.log('? CSV Parsed Successfully:');
    console.log('Headers:', Object.keys(results[0]));
    console.log('First Row:', results[0]);
    console.log('Total Rows:', results.length);
    
    // Test revenue calculation
    let totalRevenue = 0;
    results.forEach(row => {
      const revenue = parseFloat(row.Revenue);
      console.log(`Row Revenue: ${revenue}`);
      totalRevenue += revenue;
    });
    console.log(`Total Revenue: ${totalRevenue}`);
  });
