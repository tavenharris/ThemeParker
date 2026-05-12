const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:892hf8v0bC08QY73FDB@db.rypkgxcctptgvuhcstpy.supabase.co:5432/postgres'
});

const generateMockData = async () => {
  await client.connect();
  
  const { rows } = await client.query("SELECT DISTINCT ride_id, park_id FROM wait_times WHERE status = 'OPERATING'");
  
  if (rows.length === 0) {
    console.log("No rides found to seed.");
    client.end();
    return;
  }

  const insertQuery = `
    INSERT INTO wait_times (ride_id, park_id, wait_time, status, created_at)
    VALUES ($1, $2, $3, $4, $5)
  `;

  let count = 0;
  // For each ride, generate 7 days of historical data
  for (const ride of rows) {
    const baseWait = Math.floor(Math.random() * 60) + 15; // Base wait time between 15 and 75 mins
    
    for (let day = 1; day <= 7; day++) {
      for (let hour = 9; hour <= 22; hour++) {
        // Create a bell curve effect peaking around 2 PM (14:00)
        const hourDiff = Math.abs(14 - hour);
        const waitMultiplier = 1 - (hourDiff * 0.1); // Closer to 14, higher the multiplier
        const randomFluctuation = (Math.random() * 20) - 10; // +/- 10 mins
        
        let waitTime = Math.max(5, Math.floor((baseWait * waitMultiplier) + randomFluctuation));
        
        // Ensure wait times are in multiples of 5 (Disney standard)
        waitTime = Math.round(waitTime / 5) * 5;

        // Set the created_at timestamp explicitly
        const date = new Date();
        date.setDate(date.getDate() - day);
        date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);

        await client.query(insertQuery, [
          ride.ride_id,
          ride.park_id,
          waitTime,
          'OPERATING',
          date.toISOString()
        ]);
        count++;
      }
    }
  }

  console.log(`Seeded ${count} historical wait time records.`);
  client.end();
};

generateMockData().catch(console.error);
