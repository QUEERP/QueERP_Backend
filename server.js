require ("dotenv").config();

const app = require ("./src/app");

const PORT = process.env.PORT || 3001;

app.get ("/health", (req, res) => {
  res.status (200).json ({ status: "ok" });
});

app.listen (PORT, () => {
  console.log (`http://localhost:${PORT}`);
}); 
