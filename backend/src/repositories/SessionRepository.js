const { SupabaseBaseRepository } = require('../database/Database');

class SessionRepository extends SupabaseBaseRepository {
  constructor(database) {
    super(database, 'sessions');
  }

  async create(data) {
    const { data: result, error } = await this.client
      .from('sessions')
      .insert({
        user_id: data.userId,
        refresh_token: data.refreshToken,
        expires_at: data.expiresAt
      })
      .select()
      .single();

    if (error) throw error;
    return { rows: [result], rowCount: 1 };
  }

  async findByToken(refreshToken) {
    const { data, error } = await this.client
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    return { rows: data ? [data] : [], rowCount: data ? 1 : 0 };
  }

  async deleteByUserId(userId) {
    const { error } = await this.client
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { rows: [], rowCount: 0 };
  }

  async deleteByToken(refreshToken) {
    const { error } = await this.client
      .from('sessions')
      .delete()
      .eq('refresh_token', refreshToken);

    if (error) throw error;
    return { rows: [], rowCount: 0 };
  }

  async deleteExpired() {
    const { error } = await this.client
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) throw error;
    return { rows: [], rowCount: 0 };
  }
}

module.exports = SessionRepository;