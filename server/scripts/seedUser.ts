import bcrypt from 'bcryptjs';
import { query } from '../config/database.js';

async function seedUser() {
  const email = 'admin@admin.com';
  const nome = 'Administrador Geral';
  const cpf = '00000000000';
  const password = 'Admin@123';
  const cargo = 'Administrador';

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insere ou atualiza o usuário admin se ele já existir
    await query(`
      INSERT INTO users (nome, email, cpf, password, cargo) 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET 
        password = EXCLUDED.password, 
        nome = EXCLUDED.nome,
        cpf = EXCLUDED.cpf
    `, [nome, email, cpf, hashedPassword, cargo]);

    console.log('✅ Usuário administrativo criado/atualizado com sucesso!');
    console.log('---');
    console.log(`Email: ${email}`);
    console.log(`Senha: ${password}`);
    console.log('---');
    console.log('Use estas credenciais para acessar o sistema.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    process.exit(1);
  }
}

seedUser();
