import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';

const AdminFinancialReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');

  useEffect(() => {
    // Set current month as default
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
    fetchReport(currentMonth);
  }, []);

  const fetchReport = async (month) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/financial/admin/financial-report?month=${month}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }
      });
      setReport(data);
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
      toast.error('Erro ao carregar relatório financeiro');
    } finally {
      setLoading(false);
    }
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    setSelectedMonth(month);
    fetchReport(month);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) return null;

  const { metricas_gerais, por_status, top_videomakers } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatório Financeiro Mensal</h1>
          <p className="text-gray-600 mt-1">Análise detalhada de receitas e transações</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecione o Mês
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Volume Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {metricas_gerais.volume_total.toFixed(2)}</div>
            <p className="text-xs text-blue-100 mt-1">{metricas_gerais.total_transacoes} transações</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Comissões da Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {metricas_gerais.comissoes_plataforma.toFixed(2)}</div>
            <p className="text-xs text-green-100 mt-1">Receita líquida</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-100">Pagamentos Videomakers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {metricas_gerais.pagamentos_videomakers.toFixed(2)}</div>
            <p className="text-xs text-purple-100 mt-1">Total liberado</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-100">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">R$ {metricas_gerais.ticket_medio.toFixed(2)}</div>
            <p className="text-xs text-yellow-100 mt-1">Por transação</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">💰</span>
              Em Escrow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantidade:</span>
                <span className="font-bold">{por_status.em_escrow.quantidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-blue-600">R$ {por_status.em_escrow.valor.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Liberados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantidade:</span>
                <span className="font-bold">{por_status.liberados.quantidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-green-600">R$ {por_status.liberados.valor.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">↩️</span>
              Reembolsados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Quantidade:</span>
                <span className="font-bold">{por_status.reembolsados.quantidade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-bold text-red-600">R$ {por_status.reembolsados.valor.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Videomakers */}
      <Card>
        <CardHeader>
          <CardTitle>🏆 Top 10 Videomakers do Mês</CardTitle>
          <p className="text-sm text-gray-500">Videomakers com maiores ganhos no período</p>
        </CardHeader>
        <CardContent>
          {top_videomakers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum videomaker com pagamentos liberados neste mês
            </div>
          ) : (
            <div className="space-y-3">
              {top_videomakers.map((vm, idx) => (
                <div
                  key={vm.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-blue-500'
                    }`}>
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{vm.nome}</p>
                      <p className="text-sm text-gray-500">{vm.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">R$ {vm.ganhos.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Ganhos no mês</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Análise do Período</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p>• <strong>Taxa de conversão em escrow:</strong> {((por_status.em_escrow.quantidade / metricas_gerais.total_transacoes) * 100).toFixed(1)}%</p>
                <p>• <strong>Taxa de conclusão:</strong> {((por_status.liberados.quantidade / metricas_gerais.total_transacoes) * 100).toFixed(1)}%</p>
                <p>• <strong>Taxa de reembolso:</strong> {((por_status.reembolsados.quantidade / metricas_gerais.total_transacoes) * 100).toFixed(1)}%</p>
                <p>• <strong>Margem da plataforma:</strong> {((metricas_gerais.comissoes_plataforma / metricas_gerais.volume_total) * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFinancialReport;
