const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '123' }, 'mindnexus_super_secret_jwt_key_that_is_at_least_32_bytes_long_123!', { expiresIn: '30d' });
console.log(token);
