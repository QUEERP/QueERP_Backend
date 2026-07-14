const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const modelsToAdd = `
// ==========================================
// WARRANTY MODULE
// ==========================================
model Warranty {
  id              String    @id @default(uuid())
  warrantyNumber  String    @unique
  businessId      String
  projectId       String?
  customerId      String?
  
  equipment       String?
  serialNumber    String?
  manufacturer    String?
  warrantyProvider String?
  warrantyType    String?   // STANDARD, EXTENDED, COMPREHENSIVE
  
  startDate       DateTime
  endDate         DateTime
  coverageDetails String?   @db.Text
  terms           String?   @db.Text
  notes           String?   @db.Text
  
  status          String    @default("ACTIVE") // ACTIVE, EXPIRED, VOID
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  business        Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  project         Project?  @relation(fields: [projectId], references: [id])
  customer        Customer? @relation(fields: [customerId], references: [id])
  
  attachments     WarrantyAttachment[]
  reminders       WarrantyReminder[]
  amcs            AMC[]
  tickets         Ticket[]
}

model WarrantyAttachment {
  id          String   @id @default(uuid())
  warrantyId  String
  businessId  String
  fileName    String
  fileUrl     String
  uploadedAt  DateTime @default(now())

  warranty    Warranty @relation(fields: [warrantyId], references: [id], onDelete: Cascade)
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
}

model WarrantyReminder {
  id          String   @id @default(uuid())
  warrantyId  String
  businessId  String
  reminderDate DateTime
  message     String?
  isSent      Boolean  @default(false)
  
  warranty    Warranty @relation(fields: [warrantyId], references: [id], onDelete: Cascade)
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
}

// ==========================================
// AMC MODULE
// ==========================================
model AMC {
  id              String    @id @default(uuid())
  amcNumber       String    @unique
  businessId      String
  customerId      String?
  projectId       String?
  warrantyId      String?
  
  contractValue   Float     @default(0)
  amcType         String?   // COMPREHENSIVE, NON-COMPREHENSIVE, LABOR-ONLY
  coverage        String?   @db.Text
  visitFrequency  String?   // MONTHLY, QUARTERLY, BIANNUALLY, ANNUALLY
  
  startDate       DateTime
  endDate         DateTime
  renewalDate     DateTime?
  
  assignedEngineerId String?
  sla             String?
  notes           String?   @db.Text
  
  status          String    @default("ACTIVE") // ACTIVE, EXPIRED, RENEWED, CANCELLED
  paymentStatus   String    @default("PENDING") // PENDING, PAID, PARTIAL
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  business        Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  customer        Customer? @relation(fields: [customerId], references: [id])
  project         Project?  @relation(fields: [projectId], references: [id])
  warranty        Warranty? @relation(fields: [warrantyId], references: [id])
  assignedEngineer Employee? @relation("AMCEngineer", fields: [assignedEngineerId], references: [id])
  
  visits          AMCVisit[]
  renewals        AMCRenewal[]
  tickets         Ticket[]
}

model AMCVisit {
  id            String    @id @default(uuid())
  amcId         String
  businessId    String
  visitDate     DateTime
  engineerId    String?
  status        String    @default("SCHEDULED") // SCHEDULED, COMPLETED, MISSED
  notes         String?   @db.Text
  
  amc           AMC       @relation(fields: [amcId], references: [id], onDelete: Cascade)
  business      Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  engineer      Employee? @relation(fields: [engineerId], references: [id])
}

model AMCRenewal {
  id            String    @id @default(uuid())
  amcId         String
  businessId    String
  renewalDate   DateTime
  amount        Float
  status        String    @default("PENDING") // PENDING, COMPLETED
  
  amc           AMC       @relation(fields: [amcId], references: [id], onDelete: Cascade)
  business      Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
}

// ==========================================
// SUPPORT TICKETS MODULE
// ==========================================
model Ticket {
  id            String    @id @default(uuid())
  ticketNumber  String    @unique
  businessId    String
  customerId    String?
  projectId     String?
  amcId         String?
  warrantyId    String?
  
  subject       String
  description   String    @db.Text
  category      String?
  priority      String    @default("MEDIUM") // LOW, MEDIUM, HIGH, CRITICAL
  status        String    @default("OPEN")   // OPEN, IN_PROGRESS, PENDING_CUSTOMER, RESOLVED, CLOSED, CANCELLED
  
  assignedEngineerId String?
  
  expectedResolution DateTime?
  resolvedAt         DateTime?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  business      Business  @relation(fields: [businessId], references: [id], onDelete: Cascade)
  customer      Customer? @relation(fields: [customerId], references: [id])
  project       Project?  @relation(fields: [projectId], references: [id])
  amc           AMC?      @relation(fields: [amcId], references: [id])
  warranty      Warranty? @relation(fields: [warrantyId], references: [id])
  assignedEngineer Employee? @relation("TicketEngineer", fields: [assignedEngineerId], references: [id])
  
  comments      TicketComment[]
  attachments   TicketAttachment[]
}

model TicketComment {
  id          String   @id @default(uuid())
  ticketId    String
  businessId  String
  userId      String?
  comment     String   @db.Text
  isInternal  Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  user        User?    @relation(fields: [userId], references: [id])
}

model TicketAttachment {
  id          String   @id @default(uuid())
  ticketId    String
  businessId  String
  fileName    String
  fileUrl     String
  uploadedAt  DateTime @default(now())

  ticket      Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
}
`;

function injectRelation(modelName, relationString) {
  const regex = new RegExp('(model \\b' + modelName + '\\b\\s*\\{[^}]*)', 's');
  const match = schema.match(regex);
  if (match) {
    if (!match[1].includes(relationString.trim().split(' ')[0])) {
      schema = schema.replace(regex, '$1  ' + relationString + '\\n}');
      console.log('Added relation to ' + modelName);
    } else {
      console.log('Relation already present in ' + modelName);
    }
  } else {
    console.log('Model ' + modelName + ' not found');
  }
}

injectRelation('Business', 'warranties Warranty[]\\n  warrantyAttachments WarrantyAttachment[]\\n  warrantyReminders WarrantyReminder[]\\n  amcs AMC[]\\n  amcVisits AMCVisit[]\\n  amcRenewals AMCRenewal[]\\n  tickets Ticket[]\\n  ticketComments TicketComment[]\\n  ticketAttachments TicketAttachment[]');
injectRelation('Customer', 'warranties Warranty[]\\n  amcs AMC[]\\n  tickets Ticket[]');
injectRelation('Project', 'warranties Warranty[]\\n  amcs AMC[]\\n  tickets Ticket[]');
injectRelation('Employee', 'amcsAssigned AMC[] @relation("AMCEngineer")\\n  amcVisits AMCVisit[]\\n  ticketsAssigned Ticket[] @relation("TicketEngineer")');
injectRelation('User', 'ticketComments TicketComment[]');

if (!schema.includes('model Warranty')) {
  schema += '\\n' + modelsToAdd;
}

fs.writeFileSync(schemaPath, schema);
console.log('Done modifying schema.prisma');
