const express = require('express');
const path = require('path');
const app = express();
const port = 3001;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname)));
app.set('view engine', 'html');
app.engine('html', require('ejs').renderFile);
// Define routes for each HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname,  'homepage.html'));
});
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname,  'login.html'));
});

app.get('/2fa', (req, res) => {
  res.sendFile(path.join(__dirname,  '2fa.html'));
});

app.get('/2fa1', (req, res) => {
  res.sendFile(path.join(__dirname,  '2fa1.html'));
});

app.get('/make-payment', (req, res) => {
  res.sendFile(path.join(__dirname,  'payment.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname,  'new-dashboard2.html'));
});

app.get('/link-account', (req, res) => {
  res.sendFile(path.join(__dirname,  'external-accounts.html'));
});

app.get('/history1', (req, res) => {
  res.sendFile(path.join(__dirname,  'history1.html'));
});

app.get('/history2', (req, res) => {
  res.sendFile(path.join(__dirname,  'history2.html'));
});
app.get('/history3', (req, res) => {
  res.sendFile(path.join(__dirname,  'history3.html'));
});
app.get('/history4', (req, res) => {
    res.sendFile(path.join(__dirname,  'history4.html'));
});

app.get('/transactionhistory', (req, res) => {
    res.sendFile(path.join(__dirname,  'transactionhistory.html'));
});
app.get('/transferfunds', (req, res) => {
    res.sendFile(path.join(__dirname,  'transferfunds.html'));
});
app.get('/withdrawl1', (req, res) => {
    res.sendFile(path.join(__dirname,  'withdrawl1.html'));
});
app.get('/withdrawl2', (req, res) => {
    res.sendFile(path.join(__dirname,  'withdrawl2.html'));
});
app.get('/withdrawl3', (req, res) => {
    res.sendFile(path.join(__dirname,  'withdrawl3.html'));
});
app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname,  'aboutus.html'));
});
app.get('/support', (req, res) => {
  res.sendFile(path.join(__dirname,  'help.html'));
});


app.get('/transactionhistorywithdraw', (req, res) => {
  res.sendFile(path.join(__dirname,  'transactionhistorywithdraw.html'));
});

//admin routes
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname,  './admin/login.html'));
});
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname,  './admin/index.html'));
});

app.get('/admin/wallet-settings', (req, res) => {
  res.sendFile(path.join(__dirname,  './admin/wallet-settings.html'));
});

app.get('/admin/user-settings', (req, res) => {
  res.sendFile(path.join(__dirname,  './admin/user-details.html'));
});
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
