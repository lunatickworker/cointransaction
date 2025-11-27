import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// Supabase client with service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoints (인증 불필요) - 먼저 정의
app.get("/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "make-server-b6d5667f",
    version: "1.0.0"
  });
});

app.get("/make-server-b6d5667f/health", (c) => {
  return c.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "make-server-b6d5667f",
    version: "1.0.0"
  });
});

// =====================================================
// Authentication API
// =====================================================

// POST /api/auth/login - 로그인
app.post("/make-server-b6d5667f/api/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'email and password are required' }, 400);
    }

    // 사용자 조회 (RLS 우회)
    const { data: userData, error } = await supabase
      .from('users')
      .select('user_id, email, username, password_hash, role, status, level')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      return c.json({ error: '로그인 중 오류가 발생했습니다' }, 500);
    }

    if (!userData) {
      return c.json({ error: '등록되지 않은 이메일입니다' }, 401);
    }

    // 비밀번호 확인
    if (userData.password_hash !== password) {
      return c.json({ error: '비밀번호가 올바르지 않습니다' }, 401);
    }

    // 계정 상태 확인
    if (userData.status !== 'active') {
      return c.json({ error: '비활성화된 계정입니다. 관리자에게 문의하세요.' }, 403);
    }

    // last_login 업데이트
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('user_id', userData.user_id);

    // 비밀번호 제외하고 반환
    const { password_hash, ...userDataWithoutPassword } = userData;

    return c.json({ 
      success: true,
      user: userDataWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: '로그인 처리 중 오류가 발생했습니다' }, 500);
  }
});

// POST /api/auth/change-password - 비밀번호 변경
app.post("/make-server-b6d5667f/api/auth/change-password", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return c.json({ error: 'user_id and new_password are required' }, 400);
    }

    if (new_password.length < 8) {
      return c.json({ error: '비밀번호는 8자 이상이어야 합니다' }, 400);
    }

    // 비밀번호 업데이트 (RLS 우회)
    const { error } = await supabase
      .from('users')
      .update({ 
        password_hash: new_password,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Password update error:', error);
      return c.json({ error: '비밀번호 변경 중 오류가 발생했습니다' }, 500);
    }

    return c.json({ 
      success: true,
      message: '비밀번호가 성공적으로 변경되었습니다'
    });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: '비밀번호 변경 처리 중 오류가 발생했습니다' }, 500);
  }
});

// =====================================================
// Wallet API
// =====================================================

// POST /api/wallet/create - 새 지갑 주소 생성 (EOA)
app.post("/make-server-b6d5667f/api/wallet/create", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, coin_type, wallet_type = 'hot' } = body;

    if (!user_id || !coin_type) {
      return c.json({ error: 'user_id and coin_type are required' }, 400);
    }

    // ethers를 사용한 실제 EOA 생성
    const { ethers } = await import('npm:ethers@5.7.2');
    const wallet = ethers.Wallet.createRandom();

    // Private Key 암호화 (AES-256-GCM)
    const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY') || 'default-encryption-key-change-in-production';
    const crypto = globalThis.crypto;
    const encoder = new TextEncoder();
    
    // Key derivation
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(encryptionKey),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );
    
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Encrypt private key
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedPrivateKey = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoder.encode(wallet.privateKey)
    );
    
    // Store as base64
    const encryptedData = {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedPrivateKey))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt))
    };

    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id,
        coin_type,
        address: wallet.address,
        balance: 0,
        status: 'active',
        wallet_type,
        encrypted_private_key: JSON.stringify(encryptedData)
      })
      .select()
      .single();

    if (error) {
      console.error('Wallet creation error:', error);
      return c.json({ error: error.message }, 500);
    }

    // Private key는 응답에 포함하지 않음
    const { encrypted_private_key, ...walletData } = data;

    return c.json({ success: true, wallet: walletData });
  } catch (error) {
    console.error('Wallet creation error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /api/wallet/balance - 잔액 조회
app.get("/make-server-b6d5667f/api/wallet/balance", async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const coin_type = c.req.query('coin_type');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    let query = supabase
      .from('wallets')
      .select('*')
      .eq('user_id', user_id);

    if (coin_type) {
      query = query.eq('coin_type', coin_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Balance query error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, wallets: data });
  } catch (error) {
    console.error('Balance query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// =====================================================
// Deposit API
// =====================================================

// POST /api/deposit/notify - 입금 알림 (웹훅)
app.post("/make-server-b6d5667f/api/deposit/notify", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, wallet_id, coin_type, amount, tx_hash, confirmations = 0, from_address } = body;

    if (!user_id || !wallet_id || !coin_type || !amount || !tx_hash) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // 입금 기록 생성
    const { data: depositData, error: depositError } = await supabase
      .from('deposits')
      .insert({
        user_id,
        wallet_id,
        coin_type,
        amount,
        tx_hash,
        confirmations,
        required_confirmations: 3,
        status: confirmations >= 3 ? 'confirmed' : 'pending',
        from_address,
        confirmed_at: confirmations >= 3 ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (depositError) {
      console.error('Deposit creation error:', depositError);
      return c.json({ error: depositError.message }, 500);
    }

    // 확인 완료된 경우 잔액 업데이트
    if (confirmations >= 3) {
      // 현재 지갑 잔액 조회
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('wallet_id', wallet_id)
        .single();

      if (walletError) {
        console.error('Wallet query error:', walletError);
        return c.json({ error: walletError.message }, 500);
      }

      const newBalance = parseFloat(walletData.balance) + parseFloat(amount);

      // 지갑 잔액 업데이트
      const { error: updateError } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('wallet_id', wallet_id);

      if (updateError) {
        console.error('Balance update error:', updateError);
        return c.json({ error: updateError.message }, 500);
      }

      // 거래 내역 생성
      await supabase
        .from('transactions')
        .insert({
          user_id,
          wallet_id,
          type: 'deposit',
          coin_type,
          amount,
          balance_before: walletData.balance,
          balance_after: newBalance,
          reference_id: depositData.deposit_id,
          description: `Deposit confirmed: ${tx_hash}`
        });
    }

    return c.json({ success: true, deposit: depositData });
  } catch (error) {
    console.error('Deposit notification error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// =====================================================
// Withdrawal API
// =====================================================

// POST /api/withdrawal/request - 출금 요청
app.post("/make-server-b6d5667f/api/withdrawal/request", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, wallet_id, coin_type, amount, to_address, fee = 0 } = body;

    if (!user_id || !wallet_id || !coin_type || !amount || !to_address) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // 지갑 잔액 확인
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('balance, status')
      .eq('wallet_id', wallet_id)
      .single();

    if (walletError) {
      console.error('Wallet query error:', walletError);
      return c.json({ error: walletError.message }, 500);
    }

    if (walletData.status !== 'active') {
      return c.json({ error: 'Wallet is not active' }, 400);
    }

    const totalAmount = parseFloat(amount) + parseFloat(fee);
    if (parseFloat(walletData.balance) < totalAmount) {
      return c.json({ error: 'Insufficient balance' }, 400);
    }

    // 출금 한도 확인
    const { data: limitData } = await supabase
      .from('withdrawal_limits')
      .select('*')
      .eq('user_id', user_id)
      .eq('coin_type', coin_type)
      .single();

    if (limitData) {
      if (limitData.daily_used + totalAmount > limitData.daily_limit) {
        return c.json({ error: 'Daily withdrawal limit exceeded' }, 400);
      }
      if (limitData.monthly_used + totalAmount > limitData.monthly_limit) {
        return c.json({ error: 'Monthly withdrawal limit exceeded' }, 400);
      }
    }

    // 출금 요청 생성
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id,
        wallet_id,
        coin_type,
        amount,
        fee,
        to_address,
        status: 'pending'
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Withdrawal creation error:', withdrawalError);
      return c.json({ error: withdrawalError.message }, 500);
    }

    // 보안 로그 생성
    await supabase
      .from('security_logs')
      .insert({
        user_id,
        event_type: 'withdrawal_request',
        severity: parseFloat(amount) > 10 ? 'high' : 'low',
        description: `Withdrawal request: ${amount} ${coin_type} to ${to_address}`,
        status: 'pending'
      });

    return c.json({ success: true, withdrawal: withdrawalData });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /api/withdrawal/status/:id - 출금 상태 조회
app.get("/make-server-b6d5667f/api/withdrawal/status/:id", async (c) => {
  try {
    const withdrawalId = c.req.param('id');

    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('withdrawal_id', withdrawalId)
      .single();

    if (error) {
      console.error('Withdrawal status query error:', error);
      return c.json({ error: error.message }, 404);
    }

    return c.json({ success: true, withdrawal: data });
  } catch (error) {
    console.error('Withdrawal status query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// =====================================================
// Transactions API
// =====================================================

// GET /api/transactions/history - 거래 내역 조회
app.get("/make-server-b6d5667f/api/transactions/history", async (c) => {
  try {
    const user_id = c.req.query('user_id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    if (!user_id) {
      return c.json({ error: 'user_id is required' }, 400);
    }

    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Transaction history query error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({
      success: true,
      transactions: data,
      total: count,
      limit,
      offset
    });
  } catch (error) {
    console.error('Transaction history query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// =====================================================
// Admin API (추가)
// =====================================================

// GET /api/admin/withdrawals/pending - 대기 중인 출금 조회
app.get("/make-server-b6d5667f/api/admin/withdrawals/pending", async (c) => {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Pending withdrawals query error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, withdrawals: data });
  } catch (error) {
    console.error('Pending withdrawals query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// POST /api/admin/withdrawal/approve - 출금 승인
app.post("/make-server-b6d5667f/api/admin/withdrawal/approve", async (c) => {
  try {
    const body = await c.req.json();
    const { withdrawal_id, approved_by, tx_hash } = body;

    if (!withdrawal_id || !approved_by) {
      return c.json({ error: 'withdrawal_id and approved_by are required' }, 400);
    }

    // 출금 정보 조회
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('withdrawal_id', withdrawal_id)
      .single();

    if (withdrawalError) {
      return c.json({ error: withdrawalError.message }, 404);
    }

    if (withdrawalData.status !== 'pending') {
      return c.json({ error: 'Withdrawal is not in pending status' }, 400);
    }

    // 지갑 잔액 차감
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('wallet_id', withdrawalData.wallet_id)
      .single();

    if (walletError) {
      return c.json({ error: walletError.message }, 500);
    }

    const totalAmount = parseFloat(withdrawalData.amount) + parseFloat(withdrawalData.fee);
    const newBalance = parseFloat(walletData.balance) - totalAmount;

    // 잔액 업데이트
    const { error: updateBalanceError } = await supabase
      .from('wallets')
      .update({ balance: newBalance })
      .eq('wallet_id', withdrawalData.wallet_id);

    if (updateBalanceError) {
      return c.json({ error: updateBalanceError.message }, 500);
    }

    // 출금 상태 업데이트
    const { data: updatedWithdrawal, error: updateWithdrawalError } = await supabase
      .from('withdrawals')
      .update({
        status: 'completed',
        approved_by,
        tx_hash: tx_hash || `tx_${crypto.randomUUID()}`,
        processed_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('withdrawal_id', withdrawal_id)
      .select()
      .single();

    if (updateWithdrawalError) {
      return c.json({ error: updateWithdrawalError.message }, 500);
    }

    // 거래 내역 생성
    await supabase
      .from('transactions')
      .insert({
        user_id: withdrawalData.user_id,
        wallet_id: withdrawalData.wallet_id,
        type: 'withdrawal',
        coin_type: withdrawalData.coin_type,
        amount: -totalAmount,
        balance_before: walletData.balance,
        balance_after: newBalance,
        reference_id: withdrawal_id,
        description: `Withdrawal approved: ${withdrawalData.amount} ${withdrawalData.coin_type}`
      });

    return c.json({ success: true, withdrawal: updatedWithdrawal });
  } catch (error) {
    console.error('Withdrawal approval error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// POST /api/admin/withdrawal/reject - 출금 거부
app.post("/make-server-b6d5667f/api/admin/withdrawal/reject", async (c) => {
  try {
    const body = await c.req.json();
    const { withdrawal_id, rejection_reason } = body;

    if (!withdrawal_id || !rejection_reason) {
      return c.json({ error: 'withdrawal_id and rejection_reason are required' }, 400);
    }

    const { data, error } = await supabase
      .from('withdrawals')
      .update({
        status: 'rejected',
        rejection_reason,
        processed_at: new Date().toISOString()
      })
      .eq('withdrawal_id', withdrawal_id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, withdrawal: data });
  } catch (error) {
    console.error('Withdrawal rejection error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /api/admin/users - 모든 사용자 조회
app.get("/make-server-b6d5667f/api/admin/users", async (c) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, users: data });
  } catch (error) {
    console.error('Users query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// PUT /api/admin/users/:userId/level - 사용자 등급 변경
app.put("/make-server-b6d5667f/api/admin/users/:userId/level", async (c) => {
  try {
    const userId = c.req.param('userId');
    const body = await c.req.json();
    const { level } = body;

    if (!level) {
      return c.json({ error: 'level is required' }, 400);
    }

    // 유효한 등급인지 확인
    const validLevels = ['Basic', 'Standard', 'Premium', 'VIP'];
    if (!validLevels.includes(level)) {
      return c.json({ error: 'Invalid level' }, 400);
    }

    // 사용자 등급 업데이트 (service role로 RLS 우회)
    const { data, error } = await supabase
      .from('users')
      .update({ 
        level: level,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Level update error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, user: data });
  } catch (error) {
    console.error('Level update error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /api/admin/security-logs - 보안 로그 조회
app.get("/make-server-b6d5667f/api/admin/security-logs", async (c) => {
  try {
    const severity = c.req.query('severity');
    const limit = parseInt(c.req.query('limit') || '100');

    let query = supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, logs: data });
  } catch (error) {
    console.error('Security logs query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /api/admin/dashboard/stats - 대시보드 통계
app.get("/make-server-b6d5667f/api/admin/dashboard/stats", async (c) => {
  try {
    // 총 사용자 수
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 대기 중인 출금 수
    const { count: pendingWithdrawals } = await supabase
      .from('withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 오늘 입금/출금 통계
    const today = new Date().toISOString().split('T')[0];
    
    const { data: todayDeposits } = await supabase
      .from('deposits')
      .select('amount, coin_type')
      .gte('created_at', today)
      .eq('status', 'confirmed');

    const { data: todayWithdrawals } = await supabase
      .from('withdrawals')
      .select('amount, coin_type')
      .gte('created_at', today)
      .in('status', ['completed', 'processing']);

    // 지갑 총 잔액
    const { data: walletBalances } = await supabase
      .from('wallets')
      .select('coin_type, balance, wallet_type');

    return c.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        todayDeposits: todayDeposits || [],
        todayWithdrawals: todayWithdrawals || [],
        walletBalances: walletBalances || []
      }
    });
  } catch (error) {
    console.error('Dashboard stats query error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// =====================================================
// Biconomy Supertransaction API (Backend Proxy)
// =====================================================

// Helper function to decrypt private key
async function decryptPrivateKey(encryptedData: string): Promise<string> {
  const encryptionKey = Deno.env.get('WALLET_ENCRYPTION_KEY') || 'default-encryption-key-change-in-production';
  const crypto = globalThis.crypto;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  const data = JSON.parse(encryptedData);
  
  // Convert base64 to Uint8Array
  const encrypted = Uint8Array.from(atob(data.encrypted), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(data.salt), c => c.charCodeAt(0));
  
  // Key derivation
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  
  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encrypted
  );
  
  return decoder.decode(decrypted);
}

// POST /api/biconomy/compose - Biconomy Compose API 호출
app.post("/make-server-b6d5667f/api/biconomy/compose", async (c) => {
  try {
    const body = await c.req.json();
    const { chainId, from, steps, gasPayment } = body;

    if (!chainId || !from || !steps) {
      return c.json({ error: 'chainId, from, and steps are required' }, 400);
    }

    const BICONOMY_API_KEY = Deno.env.get('BICONOMY_API_KEY');
    const BICONOMY_API_URL = Deno.env.get('BICONOMY_API_URL') || 'https://supertransaction.biconomy.io/api/v1';

    if (!BICONOMY_API_KEY) {
      return c.json({ error: 'Biconomy API key not configured' }, 500);
    }

    // Biconomy API 호출
    const response = await fetch(`${BICONOMY_API_URL}/compose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BICONOMY_API_KEY,
      },
      body: JSON.stringify({
        chainId,
        from,
        steps,
        gasPayment: gasPayment || { sponsor: false }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Biconomy compose error:', error);
      return c.json({ error: error.message || 'Compose failed' }, response.status);
    }

    const result = await response.json();
    return c.json({ success: true, ...result });

  } catch (error) {
    console.error('Biconomy compose error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// POST /api/biconomy/sign-and-execute - 서명 및 실행 (Backend에서 처리)
app.post("/make-server-b6d5667f/api/biconomy/sign-and-execute", async (c) => {
  try {
    const body = await c.req.json();
    const { wallet_id, payload } = body;

    if (!wallet_id || !payload) {
      return c.json({ error: 'wallet_id and payload are required' }, 400);
    }

    // 지갑 정보 조회 (encrypted private key 포함)
    const { data: walletData, error: walletError } = await supabase
      .from('wallets')
      .select('address, encrypted_private_key')
      .eq('wallet_id', wallet_id)
      .single();

    if (walletError || !walletData) {
      return c.json({ error: 'Wallet not found' }, 404);
    }

    // Private key 복호화
    const privateKey = await decryptPrivateKey(walletData.encrypted_private_key);

    // ethers로 서명
    const { ethers } = await import('npm:ethers@5.7.2');
    const wallet = new ethers.Wallet(privateKey);
    
    // Payload를 JSON 문자열로 변환하고 서명
    const message = JSON.stringify(payload);
    const signature = await wallet.signMessage(message);

    // Biconomy Execute API 호출
    const BICONOMY_API_KEY = Deno.env.get('BICONOMY_API_KEY');
    const BICONOMY_API_URL = Deno.env.get('BICONOMY_API_URL') || 'https://supertransaction.biconomy.io/api/v1';

    const response = await fetch(`${BICONOMY_API_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': BICONOMY_API_KEY,
      },
      body: JSON.stringify({
        payload,
        signature,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Biconomy execute error:', error);
      return c.json({ error: error.message || 'Execute failed' }, response.status);
    }

    const result = await response.json();
    return c.json({ success: true, ...result });

  } catch (error) {
    console.error('Biconomy sign and execute error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// POST /api/biconomy/transfer - 전체 프로세스 처리 (Compose + Sign + Execute)
app.post("/make-server-b6d5667f/api/biconomy/transfer", async (c) => {
  try {
    const body = await c.req.json();
    const { chainId, from, to, token, amount, gasPayment } = body;

    if (!chainId || !from || !to || !token || !amount) {
      return c.json({ error: 'Missing required fields: chainId, from, to, token, amount' }, 400);
    }

    const BICONOMY_API_KEY = Deno.env.get('BICONOMY_API_KEY');
    const BICONOMY_API_URL = Deno.env.get('BICONOMY_API_URL') || 'https://supertransaction.biconomy.io/api/v1';

    if (!BICONOMY_API_KEY) {
      return c.json({ error: 'Biconomy API key not configured' }, 500);
    }

    console.log('🚀 Transfer Request:', { chainId, from, to, token, amount });

    // 관리자 지갑 조회 및 잔액 확인
    const { data: adminWalletData, error: adminWalletError } = await supabase
      .from('wallets')
      .select('wallet_id, address, balance')
      .eq('address', from)
      .single();

    if (adminWalletError || !adminWalletData) {
      console.error('❌ Admin wallet not found:', from);
      return c.json({ error: '관리자 지갑을 찾을 수 없습니다. 지갑 주소를 확인해주세요.' }, 404);
    }

    // 잔액 확인 (보낼 수량 + 예상 가스비)
    const requestedAmount = parseFloat(amount);
    const currentBalance = parseFloat(adminWalletData.balance);
    const estimatedGasFee = 0.01; // 예상 가스비 (실제로는 API에서 견적을 받아야 함)
    const totalRequired = requestedAmount + estimatedGasFee;

    console.log('💰 Balance Check:', {
      currentBalance,
      requestedAmount,
      estimatedGasFee,
      totalRequired
    });

    if (currentBalance < totalRequired) {
      const shortage = totalRequired - currentBalance;
      console.error('❌ Insufficient balance:', { currentBalance, totalRequired, shortage });
      return c.json({ 
        error: `관리자 지갑의 ${token} 잔액이 부족합니다.\n\n필요: ${totalRequired.toFixed(8)} ${token}\n보유: ${currentBalance.toFixed(8)} ${token}\n부족: ${shortage.toFixed(8)} ${token}\n\n관리자 지갑에 ${token}을 충전한 후 다시 시도해주세요.`,
        code: 'INSUFFICIENT_BALANCE',
        details: {
          required: totalRequired,
          available: currentBalance,
          shortage: shortage,
          token: token
        }
      }, 400);
    }

    // ========================================
    // 🎯 MOCK 구현: 실제 블록체인 전송 시뮬레이션
    // ========================================
    // 프로덕션 환경에서는:
    // 1. Biconomy Smart Account SDK 사용
    // 2. Private Key를 안전하게 암호화하여 저장
    // 3. 실제 블록체인 트랜잭션 실행
    // ========================================

    console.log('✅ Mock Transfer: Simulating blockchain transaction...');
    
    // Mock TX Hash 생성 (실제��는 블록체인에서 받음)
    const mockTxHash = '0x' + Array.from(
      { length: 64 }, 
      () => Math.floor(Math.random() * 16).toString(16)
    ).join('');

    console.log('✅ Mock Transfer Success:', {
      from,
      to,
      token,
      amount,
      txHash: mockTxHash
    });

    // 관리자 지갑 잔액 차감 (Mock)
    const newAdminBalance = currentBalance - requestedAmount - estimatedGasFee;
    await supabase
      .from('wallets')
      .update({ balance: newAdminBalance })
      .eq('wallet_id', adminWalletData.wallet_id);

    console.log('💰 Admin balance updated:', {
      before: currentBalance,
      after: newAdminBalance
    });

    return c.json({
      success: true,
      txHash: mockTxHash,
      quote: {
        gasCost: `${estimatedGasFee} ${token}`,
        estimatedTime: '~5 seconds'
      },
      note: 'Mock transaction - replace with real Biconomy integration in production'
    });

  } catch (error: any) {
    console.error('❌ Transfer error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// GET /api/biconomy/status/:txHash - 트랜잭션 상태 조회
app.get("/make-server-b6d5667f/api/biconomy/status/:txHash", async (c) => {
  try {
    const txHash = c.req.param('txHash');

    const BICONOMY_API_KEY = Deno.env.get('BICONOMY_API_KEY');
    const BICONOMY_API_URL = Deno.env.get('BICONOMY_API_URL') || 'https://supertransaction.biconomy.io/api/v1';

    const response = await fetch(`${BICONOMY_API_URL}/status/${txHash}`, {
      headers: {
        'x-api-key': BICONOMY_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.message || 'Status check failed' }, response.status);
    }

    const result = await response.json();
    return c.json({ success: true, ...result });

  } catch (error) {
    console.error('Biconomy status check error:', error);
    return c.json({ error: error.message || 'Internal server error' }, 500);
  }
});

// =====================================================
// User Management API
// =====================================================

// POST /api/users/update-level - 사용자 등급 변경
app.post("/make-server-b6d5667f/api/users/update-level", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, level } = body;

    if (!user_id || !level) {
      return c.json({ error: 'user_id and level are required' }, 400);
    }

    // 유효한 등급 확인
    const validLevels = ['Basic', 'Standard', 'Premium', 'VIP'];
    if (!validLevels.includes(level)) {
      return c.json({ error: 'Invalid level' }, 400);
    }

    console.log('Updating user level:', { user_id, level });

    // Supabase Admin으로 RLS 우회하여 업데이트
    const { data, error } = await supabase
      .from('users')
      .update({
        level: level,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select();

    if (error) {
      console.error('Update error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }

    if (!data || data.length === 0) {
      return c.json({ success: false, error: '사용자를 찾을 수 없습니다' }, 404);
    }

    console.log('✅ User level updated successfully');

    return c.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('User level update error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// =====================================================
// Gas Policy Management API
// =====================================================

// GET /api/gas-policy/:userId - 사용자 가스비 정책 조회
app.get("/make-server-b6d5667f/api/gas-policy/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');

    if (!userId) {
      return c.json({ success: false, error: 'userId is required' }, 400);
    }

    // 1. 사용자 레벨 확인 (RLS 우회)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('level')
      .eq('user_id', userId)
      .maybeSingle();

    if (userError || !userData) {
      return c.json({ 
        success: false, 
        error: 'User not found',
        policy: { sponsor: false, token: 'USDC' }
      }, 404);
    }

    const userLevel = userData.level || 'Basic';

    // 2. 해당 레벨의 가스비 정책 가져오기 (RLS 우회)
    const { data: policyData, error: policyError } = await supabase
      .from('gas_sponsorship_policies')
      .select('*')
      .eq('user_level', userLevel)
      .maybeSingle();

    if (policyError || !policyData) {
      return c.json({ 
        success: true, 
        policy: { sponsor: false, token: 'USDC' }
      });
    }

    // 3. 정책에 따라 gasPayment 설정
    let policy: any;
    
    switch (policyData.sponsor_mode) {
      case 'operator':
        policy = { sponsor: true };
        break;

      case 'partial':
        policy = {
          sponsor: true,
          token: policyData.gas_token || 'USDC',
          maxUserPayment: policyData.max_user_payment?.toString() || '1'
        };
        break;

      case 'user':
      default:
        policy = {
          sponsor: false,
          token: policyData.gas_token || 'USDC'
        };
        break;
    }

    return c.json({ success: true, policy });
  } catch (error: any) {
    return c.json({ 
      success: true, 
      policy: { sponsor: false, token: 'USDC' }
    });
  }
});

// POST /api/gas-policy/update - 가스비 정책 업데이트
app.post("/make-server-b6d5667f/api/gas-policy/update", async (c) => {
  try {
    const body = await c.req.json();
    const { policy_id, sponsor_mode, max_user_payment, gas_token, description, is_active } = body;

    if (!policy_id) {
      return c.json({ error: 'policy_id is required' }, 400);
    }

    console.log('Updating gas policy:', policy_id);

    // Supabase Admin으로 RLS 우회하여 업데이트
    const { data, error } = await supabase
      .from('gas_sponsorship_policies')
      .update({
        sponsor_mode,
        max_user_payment,
        gas_token,
        description,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('policy_id', policy_id)
      .select();

    if (error) {
      console.error('Update error:', error);
      return c.json({ success: false, error: error.message }, 400);
    }

    if (!data || data.length === 0) {
      return c.json({ success: false, error: '정책을 찾을 수 없습니다' }, 404);
    }

    console.log('✅ Gas policy updated successfully');

    return c.json({ success: true, data: data[0] });
  } catch (error: any) {
    console.error('Gas policy update error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

Deno.serve(app.fetch);