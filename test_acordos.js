import http from 'http';

http.get('http://localhost:5173/api/titulos/1/acordos', (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
