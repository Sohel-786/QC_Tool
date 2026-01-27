import fs from 'fs';
import path from 'path';

const modelsDir = path.join(__dirname, 'models');
const schemaPath = path.join(__dirname, 'schema.prisma');

const baseSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
`;

const modelFiles = fs.readdirSync(modelsDir).filter(file => file.endsWith('.prisma'));

const models = modelFiles
  .map(file => fs.readFileSync(path.join(modelsDir, file), 'utf-8'))
  .join("\n\n");

fs.writeFileSync(schemaPath, baseSchema + "\n\n" + models);
console.log("schema.prisma successfully generated!");
