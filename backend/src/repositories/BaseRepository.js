class BaseRepository {
  constructor(database) {
    if (!database || typeof database.query !== 'function') {
      throw new Error('BaseRepository requires a database instance with query() method');
    }
    this.db = database;
    this.tableName = this.constructor.name.replace('Repository', '').toLowerCase();
  }

  async findById(id) {
    return this.db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async findAll(filters = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    if (filters.where) {
      for (const [key, value] of Object.entries(filters.where)) {
        conditions.push(`${key} = $${params.length + 1}`);
        params.push(value);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (filters.orderBy) {
      sql += ` ORDER BY ${filters.orderBy}`;
    } else {
      sql += ` ORDER BY id`;
    }

    if (filters.limit) {
      sql += ` LIMIT ${filters.limit}`;
    }

    return this.db.query(sql, params);
  }

  async create(data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return this.db.query(sql, values);
  }

  async update(id, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;
    return this.db.query(sql, [...values, id]);
  }

  async delete(id) {
    return this.db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async count(filters = {}) {
    let sql = `SELECT COUNT(*) as total FROM ${this.tableName}`;
    const params = [];

    if (filters.where) {
      const conditions = [];
      for (const [key, value] of Object.entries(filters.where)) {
        conditions.push(`${key} = $${params.length + 1}`);
        params.push(value);
      }
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.query(sql, params);
    return parseInt(result.rows[0].total, 10);
  }
}

module.exports = BaseRepository;