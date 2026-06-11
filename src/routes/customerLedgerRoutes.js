const router=require("express").Router();

const authMiddleware=require("../middlewares/authMiddleware");
const businessMiddleware=require("../middlewares/business.middleware");
const checkPermission=require("../middlewares/checkPermission");

const{
getCustomerLedger,
getCustomerStatementPdf
}=require("../controllers/customerLedgerController");

router.post(
"/:customerId",
authMiddleware,
businessMiddleware,
checkPermission("customer", "read"),
getCustomerLedger
);

router.post(
"/:customerId/statement",
authMiddleware,
businessMiddleware,
checkPermission("customer", "read"),
getCustomerStatementPdf
);

module.exports=router;