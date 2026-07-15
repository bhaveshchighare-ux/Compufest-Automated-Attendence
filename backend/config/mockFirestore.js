const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

// Ensure database file and parent directory exist
function ensureDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      users: {},
      members: {},
      sessions: {}
    }, null, 2), 'utf8');
  }
}

function readData() {
  ensureDb();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file, resetting database:', err);
    return { users: {}, members: {}, sessions: {} };
  }
}

function writeData(data) {
  ensureDb();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

class MockDocSnapshot {
  constructor(id, data) {
    this.id = id;
    this._data = data;
    this.exists = data !== undefined && data !== null;
  }

  data() {
    return this._data ? { ...this._data } : undefined;
  }
}

class MockQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class MockDocRef {
  constructor(collectionName, docId) {
    this.collectionName = collectionName;
    this.id = docId;
  }

  async get() {
    const dbData = readData();
    const col = dbData[this.collectionName] || {};
    const docData = col[this.id];
    return new MockDocSnapshot(this.id, docData);
  }

  async set(data, options = {}) {
    const dbData = readData();
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = {};
    }

    if (options.merge && dbData[this.collectionName][this.id]) {
      dbData[this.collectionName][this.id] = {
        ...dbData[this.collectionName][this.id],
        ...data
      };
    } else {
      dbData[this.collectionName][this.id] = { ...data };
    }

    writeData(dbData);
    return { id: this.id };
  }

  async update(data) {
    const dbData = readData();
    const col = dbData[this.collectionName] || {};
    if (!col[this.id]) {
      throw new Error(`Document with ID ${this.id} does not exist in collection ${this.collectionName}`);
    }

    const doc = col[this.id] || {};
    for (const key of Object.keys(data)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = doc;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
          }
          current = current[part];
        }
        current[parts[parts.length - 1]] = data[key];
      } else {
        doc[key] = data[key];
      }
    }

    col[this.id] = doc;
    dbData[this.collectionName] = col;
    writeData(dbData);
    return { id: this.id };
  }

  async delete() {
    const dbData = readData();
    if (dbData[this.collectionName] && dbData[this.collectionName][this.id]) {
      delete dbData[this.collectionName][this.id];
      writeData(dbData);
    }
    return { id: this.id };
  }
}

class MockCollectionQuery {
  constructor(collectionName, filters = []) {
    this.collectionName = collectionName;
    this.filters = filters;
  }

  where(field, op, val) {
    return new MockCollectionQuery(this.collectionName, [...this.filters, { field, op, val }]);
  }

  async get() {
    const dbData = readData();
    const col = dbData[this.collectionName] || {};
    let docs = Object.keys(col).map(id => new MockDocSnapshot(id, col[id]));

    // Apply filters
    for (const filter of this.filters) {
      docs = docs.filter(doc => {
        const data = doc.data();
        if (!data) return false;
        const fieldValue = data[filter.field];
        switch (filter.op) {
          case '==':
            return fieldValue === filter.val;
          case '!=':
            return fieldValue !== filter.val;
          case '>':
            return fieldValue > filter.val;
          case '<':
            return fieldValue < filter.val;
          case 'in':
            return Array.isArray(filter.val) && filter.val.includes(fieldValue);
          default:
            return false;
        }
      });
    }

    return new MockQuerySnapshot(docs);
  }
}

class MockCollectionRef extends MockCollectionQuery {
  doc(id) {
    const finalId = id || Math.random().toString(36).substring(2, 15);
    return new MockDocRef(this.collectionName, finalId);
  }

  async add(data) {
    const id = Math.random().toString(36).substring(2, 15);
    const docRef = this.doc(id);
    await docRef.set(data);
    return docRef;
  }
}

class MockFirestore {
  collection(name) {
    return new MockCollectionRef(name);
  }
}

module.exports = MockFirestore;
