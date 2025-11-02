import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    tipo: 'percentage',
    valor: '',
    valor_minimo_job: '',
    max_usos: '',
    max_usos_por_usuario: 1,
    data_expiracao: '',
    descricao: '',
    ativo: true
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/financial/coupons', {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setCoupons(data);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      toast.error('Erro ao carregar cupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        code: formData.code.toUpperCase(),
        tipo: formData.tipo,
        valor: parseFloat(formData.valor),
        valor_minimo_job: formData.valor_minimo_job ? parseFloat(formData.valor_minimo_job) : null,
        max_usos: formData.max_usos ? parseInt(formData.max_usos) : null,
        max_usos_por_usuario: parseInt(formData.max_usos_por_usuario),
        data_expiracao: formData.data_expiracao || null,
        descricao: formData.descricao || null,
        ativo: formData.ativo
      };
      
      await axios.post('/api/financial/coupons', payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      
      toast.success('✅ Cupom criado com sucesso!');
      setShowForm(false);
      setFormData({
        code: '',
        tipo: 'percentage',
        valor: '',
        valor_minimo_job: '',
        max_usos: '',
        max_usos_por_usuario: 1,
        data_expiracao: '',
        descricao: '',
        ativo: true
      });
      fetchCoupons();
    } catch (error) {
      console.error('Erro ao criar cupom:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar cupom');
    }
  };

  const toggleCouponStatus = async (couponId, currentStatus) => {
    try {
      await axios.put(
        `/api/financial/coupons/${couponId}?ativo=${!currentStatus}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      );
      toast.success('Status atualizado');
      fetchCoupons();
    } catch (error) {
      toast.error('Erro ao atualizar cupom');
    }
  };

  const deleteCoupon = async (couponId) => {
    if (!window.confirm('Tem certeza que deseja deletar este cupom?')) return;
    
    try {
      await axios.delete(`/api/financial/coupons/${couponId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      toast.success('Cupom deletado');
      fetchCoupons();
    } catch (error) {
      toast.error('Erro ao deletar cupom');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cupons de Desconto</h1>
          <p className="text-gray-600 mt-1">Gerencie cupons promocionais</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? '❌ Cancelar' : '➕ Novo Cupom'}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Cupom</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código do Cupom*
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="Ex: PROMO10"
                    maxLength={20}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Desconto*
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percentage">Percentual (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor do Desconto*
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder={formData.tipo === 'percentage' ? '10 (para 10%)' : '50.00'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Mínimo do Job (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor_minimo_job}
                    onChange={(e) => setFormData({...formData, valor_minimo_job: e.target.value})}
                    placeholder="Opcional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de Usos (Total)
                  </label>
                  <input
                    type="number"
                    value={formData.max_usos}
                    onChange={(e) => setFormData({...formData, max_usos: e.target.value})}
                    placeholder="Ilimitado"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usos por Usuário
                  </label>
                  <input
                    type="number"
                    value={formData.max_usos_por_usuario}
                    onChange={(e) => setFormData({...formData, max_usos_por_usuario: e.target.value})}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de Expiração
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.data_expiracao}
                    onChange={(e) => setFormData({...formData, data_expiracao: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  rows={2}
                  placeholder="Descrição opcional do cupom"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                ✅ Criar Cupom
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Coupons List */}
      <Card>
        <CardHeader>
          <CardTitle>Cupons Cadastrados ({coupons.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {coupons.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum cupom cadastrado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className={`p-4 border rounded-lg ${
                    coupon.ativo ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-blue-600">{coupon.code}</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          coupon.ativo ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'
                        }`}>
                          {coupon.ativo ? '✅ Ativo' : '❌ Inativo'}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {coupon.tipo === 'percentage' ? `${coupon.valor}% OFF` : `R$ ${coupon.valor.toFixed(2)} OFF`}
                        </span>
                      </div>
                      
                      {coupon.descricao && (
                        <p className="text-sm text-gray-600 mb-2">{coupon.descricao}</p>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {coupon.valor_minimo_job && (
                          <div>
                            <span className="text-gray-500">Valor mínimo:</span>
                            <p className="font-medium">R$ {coupon.valor_minimo_job.toFixed(2)}</p>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-gray-500">Usos:</span>
                          <p className="font-medium">
                            {coupon.usos_totais} {coupon.max_usos ? `/ ${coupon.max_usos}` : '/ ∞'}
                          </p>
                        </div>
                        
                        {coupon.data_expiracao && (
                          <div>
                            <span className="text-gray-500">Expira em:</span>
                            <p className="font-medium">
                              {new Date(coupon.data_expiracao).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <span className="text-gray-500">Criado em:</span>
                          <p className="font-medium">
                            {new Date(coupon.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => toggleCouponStatus(coupon.id, coupon.ativo)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          coupon.ativo
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        {coupon.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCoupons;
