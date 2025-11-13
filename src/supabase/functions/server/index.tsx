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

// Health check endpoint
app.get("/make-server-b6d5667f/health", (c) => {
  return c.json({ status: "ok" });
});

// =====================================================
// Wallet API
// =====================================================

// POST /api/wallet/create - 새 지갑 주소 생성
app.post("/make-server-b6d5667f/api/wallet/create", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, coin_type, wallet_type = 'hot' } = body;

    if (!user_id || !coin_type) {
      return c.json({ error: 'user_id and coin_type are required' }, 400);
    }

    // 지갑 주소 생성 (실제로는 블록체인 연동 필요)
    const address = `${coin_type}_${crypto.randomUUID().substring(0, 8)}`;

    const { data, error } = await supabase
      .from('wallets')
      .insert({
        user_id,
        coin_type,
        address,
        balance: 0,
        status: 'active',
        wallet_type
      })
      .select()
      .single();

    if (error) {
      console.error('Wallet creation error:', error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true, wallet: data });
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

Deno.serve(app.fetch);