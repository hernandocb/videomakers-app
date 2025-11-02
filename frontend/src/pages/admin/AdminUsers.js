import React, { useEffect, useState } from 'react';
import { adminAPI } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ role: 'all', ativo: 'all', verificado: 'all' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.role && filters.role !== 'all') params.role = filters.role;
      if (filters.ativo !== 'all') params.ativo = filters.ativo === 'true';
      if (filters.verificado !== 'all') params.verificado = filters.verificado === 'true';

      const { data } = await adminAPI.getUsers(params);
      setUsers(data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId, nome) => {
    if (!window.confirm(`Deseja banir o usuário ${nome}?`)) return;

    try {
      await adminAPI.banUser(userId, 'Banimento manual pelo admin');
      toast.success(`Usuário ${nome} foi banido`);
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao banir usuário');
    }
  };

  const handleUnbanUser = async (userId, nome) => {
    try {
      await adminAPI.unbanUser(userId);
      toast.success(`Usuário ${nome} foi reativado`);
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao reativar usuário');
    }
  };

  const handleVerifyUser = async (userId, nome) => {
    try {
      await adminAPI.verifyUser(userId);
      toast.success(`Usuário ${nome} foi verificado`);
      fetchUsers();
    } catch (error) {
      toast.error('Erro ao verificar usuário');
    }
  };

  const filteredUsers = users.filter((user) =>
    user.nome.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="admin-users">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-600 mt-1">Gerenciar clientes, videomakers e admins</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Buscar por nome ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value === 'all' ? '' : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="client">Cliente</SelectItem>
                <SelectItem value="videomaker">Videomaker</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.ativo} onValueChange={(value) => setFilters({ ...filters, ativo: value === 'all' ? '' : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Banidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.verificado} onValueChange={(value) => setFilters({ ...filters, verificado: value === 'all' ? '' : value })}>
              <SelectTrigger>
                <SelectValue placeholder="Verificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Verificados</SelectItem>
                <SelectItem value="false">Não verificados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nome}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={user.role === 'admin' ? 'destructive' : user.role === 'videomaker' ? 'default' : 'secondary'}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.rating_medio > 0 ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-500">★</span>
                          <span>{user.rating_medio.toFixed(1)}</span>
                          <span className="text-gray-500 text-xs">({user.total_avaliacoes})</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col space-y-1">
                        <Badge variant={user.verificado ? 'default' : 'outline'}>
                          {user.verificado ? '✓ Verificado' : 'Não verificado'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!user.verificado && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVerifyUser(user.id, user.nome)}
                          >
                            Verificar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBanUser(user.id, user.nome)}
                        >
                          Banir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Mostrando {filteredUsers.length} de {users.length} usuários
      </div>
    </div>
  );
};

export default AdminUsers;
