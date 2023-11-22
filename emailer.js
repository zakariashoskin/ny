const nodemailer = require('nodemailer');

// Configure the transporter with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email provider
  auth: {
    user: "zakarias.hoskin@gmail.com",
    pass: "",
  }
});

// Function to send email
const sendLowInventoryEmail = (itemName) => {
  let mailOptions = {
    from: 'zakarias.hoskin@gmail.com',
    to: 'zakarias.hoskin@outlook.com',
    subject: 'Low Inventory Alert',
    text: `Inventory for ${itemName} is below 15. Please restock soon.`
  };

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

module.exports = {
  sendLowInventoryEmail
};
