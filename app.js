const createError = require('http-errors');
const express = require('express');
const path = require('path');
const exressSession = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require('body-parser');
const basicAuth = require('basic-auth-connect');
const connectFlash = require("connect-flash");

const app = express();

// Router
const indexRouter = require('./routes/index');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/static', express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser("yoyakumail"));
app.use(
  exressSession({
    secret: "yoyakumail",
    cookie: {
      maxAge:4000000
    },
    resave:false,
    saveUninitialized: false
  })
);

//connect-flashをミドルウェアとして設定
app.use(connectFlash());
//フラッシュメッセージをresのローカル変数のflashMessagesに代入
app.use((req, res, next) => {
  res.locals.flashMessages = req.flash();
  next();
});

// app.all('/', basicAuth(function(user, password) {
//   return user === 'ps' && password === 'chiyoda';
// }));
// app.all('/*', basicAuth(function(user, password) {
//   return user === 'ps' && password === 'chiyoda';
// }));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
