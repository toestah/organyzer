const express = require('express');
const logger = require('morgan');
const path = require('path');
const neo4j = require('neo4j-driver');

const xal = require('./add.js');

const app = express();

const elementMap = {
  Text: ['input', 'text'],
  Number: ['input', 'number'],
  Textarea: ['textarea', ''],
  Color: ['input', 'color'],
  Date: ['input', 'date'],
  Image: ['input', 'text'],
  Email: ['input', 'email'],
  Checkbox: ['input', 'checkbox'],
};

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver(
  'bolt://localhost',
  neo4j.auth.basic('neo4j', 'gecko45Engine')
);

async function runQuery(queryString) {
  const neo4jsession = driver.session();
  let result;

  try {
    result = await neo4jsession.writeTransaction((tx) => tx.run(queryString));
  } catch (err) {
    reject(err);
  } finally {
    neo4jsession.close();
    return result;
  }
}

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/directory', (req, res) => {
  const model = req.params.model;
  const queryString = `match(p) return p`;

  runQuery(queryString).then((result) => {
    res.render('directory', {
      records: result.records,
    });
  });
});

app.get('/directory/:model', (req, res) => {
  const model = req.params.model;
  const queryString = `match(p:${model}) return p`;

  runQuery(queryString).then((result) => {
    res.render('directory', {
      records: result.records,
    });
  });
});

app.get('/directory_plain', (req, res) => {
  const queryString = `match(p:Person) return p`;

  runQuery(queryString).then((result) => {
    res.send(result.records);
    //res.render('directory', { records: result.records });
  });
});

//res.render('directory');

app.post('/rawdata', (req, res) => {
  const query = req.body.query;
  runQuery(query).then((result) => {
    console.log(result);
    res.send(result);
    //res.render('index', { records: result.records });
  });
});

app.post('/', (req, res) => {
  const query = req.body.query;
  runQuery(query).then((result) => {
    console.log(result);
    //res.send(result);
    res.render('index', { records: result.records });
  });
});

//-----Routes to create the different models (on POST)
app.get('/create', (req, res) => {
  res.render('create');
});

app.post('/create', (req, res) => {
  //will build the create query to create the node within the database
  let queryString = `create(p:${req.body.label} {`;
  for (key in req.body) {
    if (key != 'label')
      queryString = queryString.concat(`${key}:"${req.body[key]}",`);
  }
  queryString = queryString.slice(0, -1);
  queryString = queryString.concat('})');

  let session = driver.session();

  session
    .run(queryString)
    .then(function () {
      res.redirect('/');
      session.close();
    })
    .catch((err) => console.log(err));
});

app.post('/create', (req, res) => {
  //will build the create query to create the node within the database
  let queryString = `create(p:${req.body.label} {`;
  for (key in req.body) {
    if (key != 'label')
      queryString = queryString.concat(`${key}:"${req.body[key]}",`);
  }
  queryString = queryString.slice(0, -1);
  queryString = queryString.concat('})');

  let session = driver.session();

  session
    .run(queryString)
    .then(function () {
      res.redirect('/');
      session.close();
    })
    .catch((err) => console.log(err));
});

// app.get('/createModel/:model', (req, res) => {
//   const list = ['Person', 'Company', 'Project', 'Contract'];
//   const selected = req.params.model;

//   const schema = {
//     Name: ['<input type="text" name="name">', '</input>'],
//     Address: ['<textarea name="address">', '</textarea>'],
//     Employees: ['<input type="number" name="employees">', '</input>'],
//   };

//   res.render('createInstance', {
//     list: list,
//     selected: selected,
//     schema: schema,
//     numEl: 1,
//   });
// });

app.get('/createinstance/:label', (req, res) => {
  const label = req.params.label;
  const queryString = `match(p:Schema {Model: '${label}'}) return p`;

  runQuery(queryString).then((result) => {
    console.log(result);
    //res.send(result);
    res.render('createInstance', {
      record: result.records[0]._fields[0],
      elementMap: elementMap,
    });
  });
});

app.post('/createinstance', (req, res) => {
  let queryString = `create(p:${req.body.Model} {`;
  for (key in req.body) {
    if (key != 'label')
      queryString = queryString.concat(`${key}:"${req.body[key]}",`);
  }
  queryString = queryString.slice(0, -1);
  queryString = queryString.concat('}) return p');

  runQuery(queryString).then((result) => {
    console.log(result);
    res.send(result);
    // res.render('createInstance', {
    //   record: result.records[0]._fields[0],
    //   elementMap: elementMap,
    // });
  });
});

//---------------MODEL CREATION ROUTES

app.get('/createmodel/:numEl', (req, res) => {
  res.render('createModel', { numEl: req.params.numEl });
});

app.post('/createmodel/reload', (req, res) => {
  const numEl = req.body['numEl'];
  res.redirect('/createmodel/' + numEl);
});

app.post('/createmodel/submit', (req, res) => {
  //will build the create query to create the node within the database
  let queryString = `create(s: Schema { Model: "${req.body.label}",`;

  for (let i = 0; i < req.body['numEl']; i++) {
    const keyIndex = 'key_' + i;
    const valIndex = 'val_' + i;

    queryString = queryString.concat(
      `${req.body[keyIndex]}:"${req.body[valIndex]}",`
    );
  }
  queryString = queryString.slice(0, -1);
  queryString = queryString.concat('})');

  console.log(queryString);

  let session = driver.session();

  session
    .run(queryString)
    .then(function () {
      res.redirect('/createmodel/1');
      session.close();
    })
    .catch((err) => console.log(err));
});

app.post('/changeselection', (req, res) => {
  const selection = req.body.selection;
  console.log(selection);
  res.redirect(`/create/${selection}`);
});

app.listen(5500);

module.exports = app;
