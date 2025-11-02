import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const AdminNotifications = () => {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form states
  const [notificationType, setNotificationType] = useState('broadcast'); // 'broadcast' ou 'specific'
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '', 'client', 'videomaker'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.all([
        axios.get('/api/notifications/stats', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }),
        axios.get('/api/notifications/logs?limit=50', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        })
      ]);
      
      setStats(statsRes.data);
      setLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de notificações');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    
    if (!title || !body) {
      toast.error('Título e mensagem são obrigatórios');
      return;
    }
    
    setSending(true);
    try {
      await axios.post(
        '/api/notifications/broadcast',
        {
          role: roleFilter || null,
          title,
          body,
          data: {}
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`
          }
        }
      );
      
      toast.success('✅ Notificação broadcast enviada com sucesso!');
      
      // Limpa form
      setTitle('');
      setBody('');
      setRoleFilter('');
      
      // Recarrega logs
      fetchData();
    } catch (error) {
      console.error('Erro ao enviar broadcast:', error);
      toast.error(error.response?.data?.detail || 'Erro ao enviar notificação');
    } finally {
      setSending(false);
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
    <div className="space-y-6" data-testid="admin-notifications">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notificações Push</h1>
        <p className="text-gray-600 mt-1">Gerencie e envie notificações para os usuários</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">Dispositivos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.device_tokens?.total || 0}</div>
            <p className="text-xs text-blue-100 mt-1">
              📱 Android: {stats?.device_tokens?.android || 0} | 🍎 iOS: {stats?.device_tokens?.ios || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100">Enviadas (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.last_30_days?.notifications_sent || 0}</div>
            <p className="text-xs text-green-100 mt-1">
              ✅ Taxa de sucesso: {stats?.last_30_days?.success_rate || 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-100">Falhas (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.last_30_days?.notifications_failed || 0}</div>
            <p className="text-xs text-red-100 mt-1">Notificações não entregues</p>
          </CardContent>
        </Card>
      </div>

      {/* Send Notification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Notificação Broadcast</CardTitle>
          <p className="text-sm text-gray-500">Envie notificação para todos os usuários ou filtrado por tipo</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por tipo de usuário
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os usuários</option>
                <option value="client">Apenas Clientes</option>
                <option value="videomaker">Apenas Videomakers</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título da Notificação
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                placeholder="Ex: Nova atualização disponível"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{title.length}/100 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mensagem
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Digite a mensagem da notificação..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">{body.length}/200 caracteres</p>
            </div>

            <button
              type="submit"
              disabled={sending || !title || !body}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enviando...
                </span>
              ) : (
                '📤 Enviar Notificação Broadcast'
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Notificações (Últimas 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p>Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Data/Hora</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Título</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Destinatários</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Sucesso</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Falhas</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr key={log.id || idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(log.sent_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{log.title}</p>
                        <p className="text-sm text-gray-500">{log.body}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.type === 'broadcast' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.type === 'broadcast' ? (
                            log.role_filter ? `Broadcast (${log.role_filter})` : 'Broadcast (Todos)'
                          ) : 'Específica'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {log.total_recipients || (log.user_ids?.length || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-green-600 font-medium">{log.success_count || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-red-600 font-medium">{log.failure_count || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotifications;
