import app from './app';
import dbConnect from './external-libraries/dbClient';
import { seedDatabase } from './database/seed';

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  dbConnect();
  
  // Seed database in development
  if (process.env.NODE_ENV !== 'production') {
    try {
      await seedDatabase();
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }
  
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
});
