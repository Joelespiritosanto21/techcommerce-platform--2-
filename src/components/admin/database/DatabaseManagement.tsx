'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Database, HardDrive, Table, FileText, RefreshCw, Download, Upload, Trash2,
  AlertTriangle, CheckCircle, Clock, Archive, Server, Activity
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface DatabaseStats {
  size: number;
  sizeFormatted: string;
  tables: number;
  records: number;
}

interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  type: string;
  compressed: boolean;
}

interface DatabaseConfig {
  type: string;
  host?: string;
  port?: number;
  name?: string;
}

interface DatabaseStatus {
  config: DatabaseConfig;
  connection: {
    success: boolean;
    message: string;
    latency?: number;
  };
  statistics: DatabaseStats;
  backups: BackupInfo[];
  backupsTotal: number;
}

export function DatabaseManagement() {
  const { toast } = useToast();
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/database');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      } else {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar estado da base de dados',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const createBackup = async () => {
    setCreating(true);
    try {
      const response = await fetch('/api/database/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Backup criado com sucesso'
        });
        fetchStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao criar backup',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (dropExisting: boolean) => {
    if (!selectedBackup) return;
    
    setRestoring(true);
    try {
      const response = await fetch('/api/database/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId: selectedBackup.id,
          dropExisting
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Backup restaurado com sucesso'
        });
        fetchStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao restaurar backup',
        variant: 'destructive'
      });
    } finally {
      setRestoring(false);
      setShowRestoreDialog(false);
      setSelectedBackup(null);
    }
  };

  const deleteBackup = async () => {
    if (!selectedBackup) return;
    
    try {
      const response = await fetch(`/api/database/backup/${selectedBackup.id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Backup eliminado com sucesso'
        });
        fetchStatus();
      } else {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao eliminar backup',
        variant: 'destructive'
      });
    } finally {
      setShowDeleteDialog(false);
      setSelectedBackup(null);
    }
  };

  const exportDatabase = async (format: 'sql' | 'json' | 'csv') => {
    try {
      const response = await fetch('/api/database/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: `Base de dados exportada para ${format.toUpperCase()}`
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao exportar base de dados',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Base de Dados</h2>
          <p className="text-muted-foreground">
            Gerir backups, exportar e importar dados
          </p>
        </div>
        <Button onClick={fetchStatus} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipo de BD</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{status?.config.type || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {status?.config.host && `${status.config.host}:${status.config.port}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamanho</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.statistics.sizeFormatted || '0 B'}</div>
            <p className="text-xs text-muted-foreground">
              Nome: {status?.config.name || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tabelas</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.statistics.tables || 0}</div>
            <p className="text-xs text-muted-foreground">
              {status?.statistics.records?.toLocaleString() || 0} registos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backups</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.backupsTotal || 0}</div>
            <p className="text-xs text-muted-foreground">
              Backups disponíveis
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Estado da Ligação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {status?.connection.success ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-green-600">Ligação Estabelecida</p>
                  <p className="text-sm text-muted-foreground">
                    Latência: {status.connection.latency}ms
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-600">Falha na Ligação</p>
                  <p className="text-sm text-muted-foreground">
                    {status?.connection.message}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="backups" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="export">Exportar</TabsTrigger>
          <TabsTrigger value="import">Importar</TabsTrigger>
        </TabsList>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Backups</CardTitle>
                  <CardDescription>
                    Lista de todos os backups disponíveis
                  </CardDescription>
                </div>
                <Button onClick={createBackup} disabled={creating}>
                  {creating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4 mr-2" />
                  )}
                  Criar Backup
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {status?.backups && status.backups.length > 0 ? (
                <div className="space-y-2">
                  {status.backups.map((backup) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{backup.filename}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{backup.sizeFormatted}</span>
                            <span>•</span>
                            <span>{new Date(backup.createdAt).toLocaleString('pt-PT')}</span>
                            {backup.compressed && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary">Comprimido</Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setShowRestoreDialog(true);
                          }}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Archive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum backup disponível</p>
                  <p className="text-sm">Crie um backup para começar</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exportar Base de Dados</CardTitle>
              <CardDescription>
                Exporte a base de dados para diferentes formatos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => exportDatabase('sql')}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <FileText className="h-12 w-12 mb-4 text-blue-500" />
                      <h3 className="font-semibold">SQL</h3>
                      <p className="text-sm text-muted-foreground">
                        Formato padrão para bases de dados
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => exportDatabase('json')}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <Download className="h-12 w-12 mb-4 text-green-500" />
                      <h3 className="font-semibold">JSON</h3>
                      <p className="text-sm text-muted-foreground">
                        Formato legível e portável
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => exportDatabase('csv')}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <Table className="h-12 w-12 mb-4 text-orange-500" />
                      <h3 className="font-semibold">CSV</h3>
                      <p className="text-sm text-muted-foreground">
                        Para uso em Excel ou outras apps
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Importar Dados</CardTitle>
              <CardDescription>
                Importe dados de ficheiros SQL, JSON ou CSV
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Arraste ficheiros ou clique para selecionar</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Suporta ficheiros SQL, JSON e CSV
                </p>
                <Button variant="outline">
                  Selecionar Ficheiro
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restaurar Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja restaurar o backup "{selectedBackup?.filename}"?
              <br /><br />
              <AlertTriangle className="inline h-4 w-4 text-yellow-500 mr-1" />
              Esta ação pode substituir dados existentes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => restoreBackup(false)}
              disabled={restoring}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {restoring ? 'A restaurar...' : 'Restaurar (manter dados)'}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => restoreBackup(true)}
              disabled={restoring}
              className="bg-red-600 hover:bg-red-700"
            >
              {restoring ? 'A restaurar...' : 'Restaurar (substituir tudo)'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Backup</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar o backup "{selectedBackup?.filename}"?
              <br /><br />
              Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteBackup}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
