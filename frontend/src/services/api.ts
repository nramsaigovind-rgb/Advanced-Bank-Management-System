/**
 * Advanced Bank Management System - Unified API Client
 * Connects Next.js frontend to FastAPI backend.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

class ApiClient {
  private getAuthHeader(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('abms_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...(options.headers as Record<string, string> || {}),
    };

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      try {
        const errorJson = await res.json();
        if (typeof errorJson.detail === 'string') {
          errMsg = errorJson.detail;
        } else if (Array.isArray(errorJson.detail)) {
          errMsg = errorJson.detail
            .map((e: any) => {
              const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : 'field';
              return `${field}: ${e.msg || 'invalid value'}`;
            })
            .join('; ');
        } else if (errorJson.detail && typeof errorJson.detail === 'object') {
          errMsg = JSON.stringify(errorJson.detail);
        } else if (errorJson.message) {
          errMsg = typeof errorJson.message === 'string' ? errorJson.message : JSON.stringify(errorJson.message);
        }
      } catch {
        errMsg = res.statusText || errMsg;
      }
      throw new Error(errMsg);
    }

    // Handle 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return res.json();
  }

  // ==================== AUTH ====================
  async login(formData: { username: string; password: string }) {
    return this.request<{
      access_token: string;
      token_type: string;
      role?: string;
      user_id?: number;
      username?: string;
      display_name?: string;
      permissions?: string[];
      user?: any;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // ==================== ACCOUNTS ====================
  async getAccounts(params?: { customer_id?: number; branch_id?: number; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/accounts${query ? `?${query}` : ''}`);
  }

  async getAccountById(id: number) {
    return this.request<any>(`/accounts/${id}`);
  }

  async createAccount(data: { customer_id: number; branch_id: number; account_type: string; initial_deposit: number }) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccountStatus(id: number, status: string, reason?: string) {
    return this.request<any>(`/accounts/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  }

  async getAccountCards(accountId: number) {
    return this.request<any[]>(`/accounts/${accountId}/cards`);
  }

  async toggleCardBlock(cardId: number, isBlocked: boolean) {
    return this.request<any>(`/accounts/cards/${cardId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_blocked: isBlocked, reason: isBlocked ? 'Customer requested block' : 'Customer unblock' }),
    });
  }

  async getBeneficiaries(customerId?: number) {
    const query = customerId ? `?customer_id=${customerId}` : '';
    return this.request<any[]>(`/accounts/beneficiaries/list${query}`);
  }

  async addBeneficiary(data: { customer_id?: number; beneficiary_name: string; account_number: string; bank_name?: string; ifsc_code?: string; transfer_limit?: number; nickname?: string }) {
    return this.request<any>('/accounts/beneficiaries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== CUSTOMERS ====================
  async getCustomers(params?: { search?: string; kyc_status?: string; branch_id?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/customers${query ? `?${query}` : ''}`);
  }

  async getCustomerMe() {
    return this.request<any>('/customers/me');
  }

  async registerCustomer(data: any) {
    return this.request<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKYC(customerId: number, data: { kyc_status: string; remarks?: string }) {
    return this.request<any>(`/customers/${customerId}/kyc`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== EMPLOYEES & BRANCHES ====================
  async getEmployees(branchId?: number) {
    const query = branchId ? `?branch_id=${branchId}` : '';
    return this.request<any[]>(`/employees${query}`);
  }

  async getEmployeeMe() {
    return this.request<any>('/employees/me');
  }

  async getBranches() {
    return this.request<any[]>('/branches');
  }

  // ==================== TRANSFERS & TRANSACTIONS ====================
  async transferFunds(data: {
    source_account_id: number;
    destination_account_id?: number;
    destination_account_number?: string;
    amount: number;
    description?: string;
    remarks?: string;
    idempotency_key?: string;
  }) {
    const desc = data.description || data.remarks || 'Funds transfer via web banking';
    const destNum = data.destination_account_number || (data.destination_account_id !== undefined ? String(data.destination_account_id) : '');
    return this.request<any>('/transfers', {
      method: 'POST',
      body: JSON.stringify({
        source_account_id: data.source_account_id,
        destination_account_number: destNum,
        destination_account_id: data.destination_account_id,
        amount: data.amount,
        description: desc,
        remarks: desc,
        idempotency_key: data.idempotency_key,
      }),
    });
  }

  async depositFunds(data: { account_id: number; amount: number; description?: string; remarks?: string }) {
    const desc = data.description || data.remarks || 'Cash deposit';
    return this.request<any>('/transfers/deposit', {
      method: 'POST',
      body: JSON.stringify({
        account_id: data.account_id,
        amount: data.amount,
        description: desc,
        remarks: desc,
      }),
    });
  }

  async withdrawFunds(data: { account_id: number; amount: number; description?: string; remarks?: string }) {
    const desc = data.description || data.remarks || 'Cash withdrawal';
    return this.request<any>('/transfers/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        account_id: data.account_id,
        amount: data.amount,
        description: desc,
        remarks: desc,
      }),
    });
  }

  async getTransactionHistory(params?: {
    account_id?: number;
    transaction_type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any>(`/transfers/history${query ? `?${query}` : ''}`);
  }

  // DBMS Concurrency & Fault-injection simulation endpoints
  async simulateRollbackFailure(data: {
    source_account_id: number;
    destination_account_id: number;
    amount: number;
    fail_stage: 'before_credit' | 'after_credit' | 'during_ledger' | 'none';
  }) {
    return this.request<any>('/transfers/simulate-failure', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runConcurrencyRace(data: {
    account_id: number;
    tx1_amount: number;
    tx2_amount: number;
    delay_ms?: number;
  }) {
    return this.request<any>('/transfers/concurrency-race', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== LOANS ====================
  async getLoans(params?: { customer_id?: number; branch_id?: number; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/loans${query ? `?${query}` : ''}`);
  }

  async applyLoan(data: {
    customer_id: number;
    branch_id: number;
    loan_type: string;
    principal_amount: number;
    interest_rate: number;
    term_months: number;
  }) {
    return this.request<any>('/loans/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async approveLoan(loanId: number, remarks?: string) {
    return this.request<any>(`/loans/${loanId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ remarks }),
    });
  }

  async disburseLoan(loanId: number, targetAccountId: number) {
    return this.request<any>(`/loans/${loanId}/disburse`, {
      method: 'POST',
      body: JSON.stringify({ target_account_id: targetAccountId }),
    });
  }

  async getLoanInstallments(loanId: number) {
    return this.request<any[]>(`/loans/${loanId}/installments`);
  }

  async repayLoanInstallment(installmentId: number, sourceAccountId: number) {
    return this.request<any>(`/loans/installments/${installmentId}/repay`, {
      method: 'POST',
      body: JSON.stringify({ source_account_id: sourceAccountId }),
    });
  }

  // ==================== FRAUD DETECTION ====================
  async getFraudAlerts(params?: { status?: string; min_severity?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<any[]>(`/fraud/alerts${query ? `?${query}` : ''}`);
  }

  async getFraudGraph(accountId?: number) {
    const endpoint = accountId ? `/fraud/graph/${accountId}` : '/fraud/graph';
    return this.request<any>(endpoint);
  }

  async detectFraudCycles() {
    return this.request<any>('/fraud/detect-cycles', {
      method: 'POST',
    });
  }

  // ==================== REPORTS & ANALYTICS ====================
  async getBranchReport(branchId: number) {
    return this.request<any>(`/reports/branch/${branchId}`);
  }

  async getAllBranchesReport() {
    return this.request<any>('/reports/all-branches');
  }

  async reconcileAccount(accountId: number) {
    return this.request<any>(`/reports/reconcile/${accountId}`);
  }

  async getTopCustomers(limit: number = 10) {
    return this.request<any>(`/reports/top-customers?limit=${limit}`);
  }

  // ==================== DBMS DIAGNOSTICS & LAB ====================
  async getDiagnosticsQueries() {
    return this.request<any>('/admin/diagnostics/queries');
  }

  async explainQuery(queryKey: string) {
    return this.request<any>(`/admin/diagnostics/explain/${queryKey}`);
  }

  async getActiveLocks() {
    return this.request<any>('/admin/diagnostics/locks');
  }

  async getCacheStats() {
    return this.request<any>('/admin/diagnostics/cache');
  }

  async benchmarkCache(iterations: number = 20) {
    return this.request<any>(`/admin/diagnostics/cache/benchmark?iterations=${iterations}`);
  }

  async verifyAuditChain() {
    return this.request<any>('/admin/diagnostics/audit-verify');
  }
}

export const api = new ApiClient();
export default api;

