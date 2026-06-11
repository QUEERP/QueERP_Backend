//////////////////////////////////////////////////////
// ONLY SUBSCRIPTION ADMIN ACCESS
//////////////////////////////////////////////////////
const subscriptionAdminOnly = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  //////////////////////////////////////////////////////
  // CHECK ENV ADMIN LOGIN
  //////////////////////////////////////////////////////
  if (req.user.userId !== "subscription-admin") {
    return res.status(403).json({
      success: false,
      message: "Only Subscription Admin allowed",
    });
  }

  next();
};

module.exports = subscriptionAdminOnly;