require("dotenv").config();

const { PrismaClient } = require("../../generated/prisma");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Client, Pool } = require("pg");
const dns = require("dns");

class CustomClient extends Client {
  connect(callback) {
    const originalHost = this.host;
    dns.lookup(originalHost, { family: 4 }, (err, address) => {
      if (err) {
        console.error("[Prisma CustomClient] DNS resolution failed:", err.message);
        return super.connect(callback);
      }
      this.host = address;

      // Ensure servername is set to originalHost for TLS validation
      if (this.ssl && typeof this.ssl === "object") {
        this.ssl.servername = originalHost;
      } else if (this.ssl) {
        this.ssl = {
          rejectUnauthorized: false,
          servername: originalHost,
        };
      }

      super.connect(callback);
    });
  }
}

console.log("PRISMA CONFIG DATABASE_URL VALUE:", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  Client: CustomClient,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;