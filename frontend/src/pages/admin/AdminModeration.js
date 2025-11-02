import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AdminModeration = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data } = await adminAPI.getModerationLogs();
      setLogs(data);
    } catch (error) {
      toast.error('Erro ao carregar logs de moderação');
    } finally {
      setLoading(false);
    }
  };

  const getReasonBadge = (reason) => {
    const variants = {
      phone_number: { color: 'bg-red-100 text-red-800', label: 'Telefone' },
      email: { color: 'bg-orange-100 text-orange-800', label: 'Email' },
      url: { color: 'bg-yellow-100 text-yellow-800', label: 'Link' },
    };

    const config = variants[reason] || { color: 'bg-gray-100 text-gray-800', label: reason };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="admin-moderation">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Moderação de Chat</h1>
        <p className="text-gray-600 mt-1">Mensagens bloqueadas automaticamente</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bloqueado</p>
                <p className="text-3xl font-bold text-gray-900">{logs.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Telefones</p>
                <p className="text-3xl font-bold text-gray-900">
                  {logs.filter((l) => l.reason === 'phone_number').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Emails/Links</p>
                <p className="text-3xl font-bold text-gray-900">
                  {logs.filter((l) => l.reason === 'email' || l.reason === 'url').length}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Bloqueios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Nenhuma mensagem bloqueada ainda
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Remetente</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Conteúdo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-sm">
                      {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.chat_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.sender_id.substring(0, 8)}...
                    </TableCell>
                    <TableCell>{getReasonBadge(log.reason)}</TableCell>
                    <TableCell className="max-w-md truncate">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.content}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Total: {logs.length} mensagens bloqueadas
      </div>
    </div>
  );
};

export default AdminModeration;
