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

async function updateElementMap() {
  elementMap = {
    Text: ['input', 'text'],
    Number: ['input', 'number'],
    Textarea: ['textarea', ''],
    Color: ['input', 'color'],
    Date: ['input', 'date'],
    Image: ['input', 'text'],
    Email: ['input', 'email'],
    Checkbox: ['input', 'checkbox'],
  };

  let models = [];
  let options = [];

  // First get a list of all the Models

  const queryString = `match(s: Schema) return s.Model`;

  runQuery(queryString)
    .then((result) => {
      result.records.forEach((record) => {
        models.push(record._fields[0]); // populates models with list of all model names
      });

      models.forEach((model) => {
        let queryString2 = `match(s: ${model}) return s.Name`;
        //console.log(queryString2);
        let options = [];

        runQuery(queryString2).then((result2) => {
          let records2 = result2.records;
          records2.forEach((record) => {
            options.push(record._fields[0]);
          });
          console.log(options);
          console.log('innn ^');
          elementMap[model] = ['select', options];
        });
      });
    })
    .finally(() => {
      console.log(elementMap);
    });

  // Iterate through those Models

  // Get a list of all names of instances of the currently iterated Model

  // Generate an array with those names

  // Next, create the ['select', [namesarray]] variable

  // Next, push that variable to the elementMap (key is the currently iterated Model)

  // Finally, return

  //runQuery();

  //elementMap[key] = val;
}

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

// API Routes
app.get('/', (req, res) => {
  updateElementMap();
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
    res.send(result);
    //res.render('index', { records: result.records });
  });
});

app.post('/', (req, res) => {
  const query = req.body.query;
  runQuery(query).then((result) => {
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

//--------------INSTANCE CREATION ROUTES

app.get('/createinstance/:model', async (req, res) => {
  await updateElementMap();
  let model = req.params.model;
  const queryString = `match(p:Schema {Model: '${model}'}) return p`; //returns schema for that Model
  const queryString2 = `match(s: Schema) return s.Model`; //returns list of all Models
  runQuery(queryString).then((result) => {
    runQuery(queryString2).then((result2) => {
      fields = result.records;
      models = result2.records;
      res.render('createInstance', {
        fields: fields[0]._fields[0],
        activeModel: model,
        models: models,
        elementMap: elementMap,
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
    //console.log(queryString);
    //console.log(result);
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

//----------DELETE -------

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
    //console.log(result);
    res.redirect('/createinstance/' + req.body.label);
  });
});

app.listen(5500);

module.exports = app;

//--------- DEPRECATED BELOW

// app.post('/changeselection', (req, res) => {
//   const selection = req.body.selection;
//   console.log(selection);
//   res.redirect(`/create/${selection}`);
// });

// app.get('/createinstance/:label', (req, res) => {
//   //-------------Definitions -------------

//   const label = req.params.label;

//   const queryString = `match(p:Schema {Model: '${label}'}) return p`; //returns all instances belonging to that Model
//   const queryString2 = `match(s: Schema) return s.Model`; //returns list of all Models

//   let elementMap = {
//     Text: ['input', 'text'],
//     Number: ['input', 'number'],
//     Textarea: ['textarea', ''],
//     Color: ['input', 'color'],
//     Date: ['input', 'date'],
//     Image: ['input', 'text'],
//     Email: ['input', 'email'],
//     Checkbox: ['input', 'checkbox'],
//   };

//   runQuery(queryString).then((result) => {
//     runQuery(queryString2).then((result2) => {
//       let models = [];
//       result2.records.forEach((record) => {
//         models.push(record._fields[0]);
//       });
//       //console.log(models);

//       models.forEach((model) => {
//         const queryString3 = `match(p: ${model}) return p.Name`; //returns names of all instances belonging to that Model

//         runQuery(queryString3).then((result3) => {
//           let names = []; //These are names of all Instances of the given Model
//           result3.records.forEach((record) => {
//             //elementMap[model] = ['select', ''];
//             names.push(record._fields[0]);
//           });
//           console.log(names);
//         });
//       });

//       console.log(elementMap);
//       res.send('ok');
//     });
//   });
// });

// app.get('/createinstance/:label', (req, res) => {
//   const label = req.params.label;

//   const queryString = `match(p:Schema {Model: '${label}'}) return p`; //returns all instances belonging to that Model
//   const queryString2 = `match(s: Schema) return s.Model`; //returns list of all Models

//   //need a list of names for a given Model

//   let elementMap = {
//     Text: ['input', 'text'],
//     Number: ['input', 'number'],
//     Textarea: ['textarea', ''],
//     Color: ['input', 'color'],
//     Date: ['input', 'date'],
//     Image: ['input', 'text'],
//     Email: ['input', 'email'],
//     Checkbox: ['input', 'checkbox'],
//   };

//   runQuery(queryString).then((result) => {
//     runQuery(queryString2).then((result2) => {
//       let models = [];
//       result2.records.forEach((record) => {
//         models.push(record._fields[0]);
//       });
//       console.log(models);

//       models.forEach((model) => {
//         const queryString3 = `match(p:${model}) return p.Name`; //returns names of all instances belonging to that Model
//         runQuery(queryString3).then((result3) => {
//         let names = []; //These are names of all Instances of the given Model
//         result3.records.forEach((record) => {
//           names.push(record._fields[0]);

//         });
//       });

//     })

//       // runQuery(queryString3).then((result3) => {
//       //   let names = []; //These are names of all Instances of the given Model
//       //   result3.records.forEach((record) => {
//       //     names.push(record._fields[0]);
//       //     elementMap[]
//       //   });

//       //   // names.forEach((name) => {
//       //   //   elementMap;
//       //   // });

//       //   console.log(names);

//       //   res.render('createInstance', {
//       //     record: result.records[0]._fields[0],
//       //     record2: result2.records,
//       //     elementMap: elementMap,
//       //   });
//       // });
//   //   });
//   // });

//   // runQuery(queryString).then((instances) => {
//   //   runQuery(queryString2).then((models) => {
//   //     runQuery(queryString3).then((result3) => {
//   //       const records3 = result3.records;
//   //       let elementMap = {
//   //         Text: ['input', 'text'],
//   //         Number: ['input', 'number'],
//   //         Textarea: ['textarea', ''],
//   //         Color: ['input', 'color'],
//   //         Date: ['input', 'date'],
//   //         Image: ['input', 'text'],
//   //         Email: ['input', 'email'],
//   //         Checkbox: ['input', 'checkbox'],
//   //       };

//   //       records3.forEach((record) => {
//   //         const newKey = record._fields[0];
//   //         elementMap[record._fields[0]] = ['select', ''];
//   //       });

//   //       res.render('createInstance', {
//   //         record: result.records[0]._fields[0],
//   //         record2: result2.records,
//   //         elementMap: elementMap,
//   //       });
//   //     });
//   //   });
//   // });
// // });
