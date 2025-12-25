import axios from 'axios';

describe('GET /', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      message: 'Simultandolmetscher API',
      translator: '/translator',
      websocket: '/ws/translate',
    });
  });
});
