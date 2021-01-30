const express = require('express');
const logger = require('morgan');
const path = require('path');
const neo4j = require('neo4j-driver');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

var driver = neo4j.driver(
  'bolt://localhost',
  neo4j.auth.basic('neo4j', 'gecko45Engine')
);

// Basic function to run a cypher query on the database
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

function getElementMap() {
  // A Dictionary for html input and respective select options

  queryString = `match(s: Schema) return s.Model`;

  runQuery(queryString).then((result) => {
    const records = result.records;
    let elementMap = {
      Text: ['input', 'text'],
      Number: ['input', 'number'],
      Textarea: ['textarea', ''],
      Color: ['input', 'color'],
      Date: ['input', 'date'],
      Image: ['input', 'text'],
      Email: ['input', 'email'],
      Checkbox: ['input', 'checkbox'],
    };

    records.forEach((record) => {
      //console.log(record._fields[0]);
      //elementMap[record._fields[0]] = ['select', ''];
      const newKey = record._fields[0];
      //console.log(newKey);
      elementMap[record._fields[0]] = ['select', ''];

      //Object.assign(elementMap, { weight: '125' });

      //elementMap = { [newKey]: 'John' };

      //Object.assign(elementMap, {record._fields[0] : '["select",""]' });
      //console.log(elementMap['Athlete']);
    });
    console.log(elementMap);
    return elementMap;
  });
}

// API Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/directory', (req, res) => {
  const model = req.params.model;
  const queryString = `match(p) return p`;
  const queryString2 = `match(s: Schema) return s.Model`;

  runQuery(queryString).then((result) => {
    runQuery(queryString2).then((result2) => {
      res.render('directory', {
        records: result.records,
        record2: result2.records,
      });
    });
  });
});

app.get('/directory/:model', (req, res) => {
  const model = req.params.model;
  const queryString = `match(p:${model}) return p`;
  const queryString2 = `match(s: Schema) return s.Model`;

  runQuery(queryString).then((result) => {
    runQuery(queryString2).then((result2) => {
      res.render('directory', {
        record: result.records,
        record2: result2.records,
        model: req.params.model,
      });
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

//--------------INSTANCE CREATION ROUTES

app.get('/createinstance/:label', (req, res) => {
  const label = req.params.label;
  const queryString = `match(p:Schema {Model: '${label}'}) return p`;
  const queryString2 = `match(s: Schema) return s.Model`;
  runQuery(queryString).then((result) => {
    runQuery(queryString2).then((result2) => {
      console.log(result2.records);
      res.render('createInstance', {
        record: result.records[0]._fields[0],
        record2: result2.records,
        elementMap: getElementMap(),
      });
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
    console.log(queryString);
    console.log(result);
    res.redirect(`./directory/${req.body.Model}`);
    // res.render('createInstance', {
    //   record: result.records[0]._fields[0],
    //   elementMap: elementMap,
    // });
  });
});

//------------- View Models

app.get('/viewmodels', (req, res) => {
  let queryString = `match(s: Schema) return s.Model`;

  runQuery(queryString).then((result) => {
    res.render('viewModels', { models: result.records });
  });

  //res.render('viewModels');
});

app.get('/deletemodel/:label', (req, res) => {
  let queryString = `match(s: Schema {Model: "${req.params.label}"}) detach delete s;`;

  runQuery(queryString).then((result) => {
    res.redirect('/viewmodels');
  });
});

app.get('/deleteinstance/:instance/:name', (req, res) => {
  let queryString = `match(s: ${req.params.instance} {Name: "${req.params.name}"}) detach delete s;`;

  runQuery(queryString).then(() => {
    res.redirect(`/directory/${req.params.instance}`);
  });
});

//---------------MODEL CREATION ROUTES

app.get('/createmodel/:numEl', (req, res) => {
  const queryString2 = `match(s: Schema) return s.Model`;
  runQuery(queryString2).then((result2) => {
    res.render('createModel', {
      numEl: req.params.numEl,
      record2: result2.records,
    });
  });
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

  runQuery(queryString).then((result) => {
    console.log(result);
    res.redirect('/createinstance/' + req.body.label);
  });
});

app.post('/changeselection', (req, res) => {
  const selection = req.body.selection;
  console.log(selection);
  res.redirect(`/create/${selection}`);
});

app.listen(5500);

module.exports = app;
