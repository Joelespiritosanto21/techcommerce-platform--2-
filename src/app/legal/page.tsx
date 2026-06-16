'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, Scale, AlertTriangle, Shield, ExternalLink, 
  ChevronRight, Package, Home, Mail, Phone, MapPin 
} from 'lucide-react'
import Link from 'next/link'

export default function LegalPage() {
  const [currentPage, setCurrentPage] = useState<string>('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setCurrentPage(params.get('page') || '')
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">TechCommerce</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="flex items-center gap-1 hover:text-primary">
                <Home className="h-4 w-4" /> Início
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {!currentPage && <LegalIndex />}
          {currentPage === 'termos' && <TermosCondicoes />}
          {currentPage === 'privacidade' && <PoliticaPrivacidade />}
          {currentPage === 'reclamacoes' && <LivroReclamacoes />}
          {currentPage === 'litigios' && <ResolucaoLitigios />}
          {currentPage === 'cookies' && <PoliticaCookies />}
          {currentPage === 'garantia' && <PoliticaGarantia />}
          {currentPage === 'devolucoes' && <PoliticaDevolucoes />}
          {currentPage === 'envio' && <PoliticaEnvio />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} TechCommerce. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

function LegalIndex() {
  const legalPages = [
    {
      id: 'termos',
      title: 'Termos e Condições',
      description: 'Condições gerais de utilização do website e compra de produtos',
      icon: FileText
    },
    {
      id: 'privacidade',
      title: 'Política de Privacidade',
      description: 'Como tratamos e protegemos os seus dados pessoais',
      icon: Shield
    },
    {
      id: 'cookies',
      title: 'Política de Cookies',
      description: 'Informação sobre o uso de cookies no nosso website',
      icon: FileText
    },
    {
      id: 'reclamacoes',
      title: 'Livro de Reclamações',
      description: 'Submeta a sua reclamação através do livro de reclamações eletrónico',
      icon: AlertTriangle,
      external: true
    },
    {
      id: 'litigios',
      title: 'Resolução de Litígios',
      description: 'Informação sobre resolução alternativa de litígios de consumo',
      icon: Scale,
      highlight: true
    },
    {
      id: 'garantia',
      title: 'Política de Garantia',
      description: 'Condições de garantia dos produtos vendidos',
      icon: Shield
    },
    {
      id: 'devolucoes',
      title: 'Política de Devoluções',
      description: 'Condições para devolução e troca de produtos',
      icon: FileText
    },
    {
      id: 'envio',
      title: 'Política de Envio',
      description: 'Informação sobre métodos e custos de envio',
      icon: FileText
    }
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Informação Legal</h1>
      <p className="text-muted-foreground mb-8">
        Consulte toda a informação legal sobre os nossos serviços e políticas.
      </p>

      <div className="grid gap-4">
        {legalPages.map((page) => (
          page.external ? (
            <a
              key={page.id}
              href="https://www.livroreclamacoes.pt/"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${page.highlight ? 'bg-primary/10' : 'bg-slate-100'}`}>
                      <page.icon className={`h-6 w-6 ${page.highlight ? 'text-primary' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {page.title}
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </h3>
                      <p className="text-sm text-muted-foreground">{page.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </a>
          ) : (
            <Link key={page.id} href={`?page=${page.id}`} className="block">
              <Card className={`hover:border-primary transition-colors cursor-pointer ${page.highlight ? 'border-primary/50' : ''}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${page.highlight ? 'bg-primary/10' : 'bg-slate-100'}`}>
                      <page.icon className={`h-6 w-6 ${page.highlight ? 'text-primary' : 'text-slate-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{page.title}</h3>
                      <p className="text-sm text-muted-foreground">{page.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )
        ))}
      </div>
    </div>
  )
}

function TermosCondicoes() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl">Termos e Condições</CardTitle>
        <CardDescription>Última atualização: {new Date().toLocaleDateString('pt-PT')}</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <Separator className="mb-6" />
        
        <h2 className="text-lg font-semibold mt-6 mb-3">1. Disposições Gerais</h2>
        <p className="text-muted-foreground mb-4">
          Os presentes Termos e Condições regulam a utilização do website e a aquisição de produtos 
          e serviços através da plataforma TechCommerce. Ao aceder e utilizar este website, o utilizador 
          declara que leu, compreendeu e aceita integralmente os presentes Termos e Condições, 
          comprometendo-se a cumpri-los.
        </p>
        <p className="text-muted-foreground mb-4">
          A TechCommerce reserva-se o direito de alterar os presentes Termos e Condições a qualquer 
          momento, sem necessidade de aviso prévio. As alterações entrarão em vigor imediatamente 
          após a sua publicação no website. Recomendamos que consulte periodicamente esta página.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Informação sobre a Empresa</h2>
        <p className="text-muted-foreground mb-4">
          A TechCommerce é uma empresa registada em Portugal, com sede social em Lisboa, 
          dedicada à venda de produtos tecnológicos, equipamentos informáticos, e prestação 
          de serviços de reparação e manutenção de equipamentos tecnológicos.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Condições de Compra</h2>
        <p className="text-muted-foreground mb-4">
          Para efetuar compras no nosso website, o cliente deve ter idade igual ou superior a 18 anos 
          ou ser emancipado. As compras efetuadas por menores de idade carecem de autorização 
          prévia dos pais ou responsáveis legais.
        </p>
        <p className="text-muted-foreground mb-4">
          Os preços apresentados no website incluem IVA à taxa legal em vigor. A TechCommerce 
          reserva-se o direito de alterar os preços a qualquer momento, sem necessidade de aviso prévio. 
          No entanto, as alterações de preço não afetam encomendas já confirmadas.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. Encomendas e Pagamentos</h2>
        <p className="text-muted-foreground mb-4">
          Após a confirmação da encomenda, o cliente receberá um email com os detalhes da mesma. 
          A confirmação da encomenda não garante a disponibilidade do produto. Caso o produto 
          não esteja disponível, o cliente será contactado e terá direito a reembolso integral.
        </p>
        <p className="text-muted-foreground mb-4">
          Aceitamos as seguintes formas de pagamento: Transferência bancária, MB Way, 
          Cartão de crédito/débito (Visa, Mastercard), PayPal, e Multibanco (referência).
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">5. Entrega</h2>
        <p className="text-muted-foreground mb-4">
          Os prazos de entrega variam consoante o método de envio escolhido e a localização do cliente. 
          Os prazos indicados são estimativas e podem sofrer alterações devido a circunstâncias 
          imprevistas (greves, condições meteorológicas, etc.).
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">6. Direito de Livre Resolução</h2>
        <p className="text-muted-foreground mb-4">
          Nos termos do Decreto-Lei n.º 24/2014, o consumidor dispõe de um prazo de 14 dias 
          para exercer o direito de livre resolução do contrato, sem necessidade de indicar 
          qualquer motivo. Este prazo conta-se a partir da data de receção do produto.
        </p>
        <p className="text-muted-foreground mb-4">
          Para exercer este direito, o cliente deve contactar-nos através do email ou telefone 
          indicados na secção de contacto. O produto deve ser devolvido em perfeitas condições, 
          na sua embalagem original e completo.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">7. Garantia</h2>
        <p className="text-muted-foreground mb-4">
          Todos os produtos vendidos beneficiam da garantia legal de conformidade prevista 
          no Decreto-Lei n.º 67/98, de 18 de outubro, com o mínimo de 2 anos para bens novos 
          e 1 ano para bens em segunda mão. A garantia cobre defeitos de fabrico e de materiais.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">8. Propriedade Intelectual</h2>
        <p className="text-muted-foreground mb-4">
          Todo o conteúdo presente no website (textos, imagens, logótipos, design, software) 
          está protegido por direitos de autor e outras leis de propriedade intelectual. 
          É expressamente proibida a reprodução, distribuição ou modificação de qualquer 
          conteúdo sem autorização prévia por escrito.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">9. Limitação de Responsabilidade</h2>
        <p className="text-muted-foreground mb-4">
          A TechCommerce não será responsável por danos diretos ou indiretos resultantes 
          da utilização ou impossibilidade de utilização do website, incluindo perdas de dados, 
          lucros cessantes, ou quaisquer outros danos.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">10. Lei Aplicável e Foro</h2>
        <p className="text-muted-foreground mb-4">
          Os presentes Termos e Condições são regidos pela lei portuguesa. Para a resolução 
          de qualquer litígio decorrente da interpretação ou execução dos presentes termos, 
          é competente o foro da comarca de Lisboa, com expressa renúncia a qualquer outro.
        </p>

        <div className="bg-slate-50 p-4 rounded-lg mt-6">
          <h3 className="font-semibold mb-2">Contactos</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" /> info@techcommerce.pt
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Phone className="h-4 w-4" /> +351 21 123 4567
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Lisboa, Portugal
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function PoliticaPrivacidade() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl">Política de Privacidade</CardTitle>
        <CardDescription>Última atualização: {new Date().toLocaleDateString('pt-PT')}</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <Separator className="mb-6" />
        
        <h2 className="text-lg font-semibold mt-6 mb-3">1. Introdução</h2>
        <p className="text-muted-foreground mb-4">
          A TechCommerce compromete-se a proteger a privacidade dos seus clientes e utilizadores. 
          Esta Política de Privacidade descreve como recolhemos, utilizamos, armazenamos e protegemos 
          os seus dados pessoais, em conformidade com o Regulamento Geral sobre a Proteção de Dados 
          (RGPD) - Regulamento (UE) 2016/679.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Dados Pessoais Recolhidos</h2>
        <p className="text-muted-foreground mb-4">
          Recolhemos os seguintes dados pessoais:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li><strong>Dados de identificação:</strong> nome completo, morada, NIF</li>
          <li><strong>Dados de contacto:</strong> email, telefone, morada de entrega/faturação</li>
          <li><strong>Dados de conta:</strong> nome de utilizador, palavra-passe (encriptada)</li>
          <li><strong>Dados de transação:</strong> histórico de encomendas, pagamentos</li>
          <li><strong>Dados técnicos:</strong> endereço IP, tipo de browser, dispositivo utilizado</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Finalidades do Tratamento</h2>
        <p className="text-muted-foreground mb-4">
          Os dados pessoais são tratados para as seguintes finalidades:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li>Processamento e gestão de encomendas</li>
          <li>Prestação de serviços de assistência técnica e reparações</li>
          <li>Comunicação com clientes sobre encomendas, reparações e suporte</li>
          <li>Envio de newsletters e comunicações de marketing (com consentimento)</li>
          <li>Cumprimento de obrigações legais e fiscais</li>
          <li>Melhoria dos nossos serviços e experiência do utilizador</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. Base Legal para o Tratamento</h2>
        <p className="text-muted-foreground mb-4">
          O tratamento dos dados pessoais baseia-se nas seguintes bases legais:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li><strong>Execução de contrato:</strong> para processar encomendas e prestar serviços</li>
          <li><strong>Consentimento:</strong> para envio de comunicações de marketing</li>
          <li><strong>Obrigação legal:</strong> para cumprimento de obrigações fiscais e contabilísticas</li>
          <li><strong>Interesse legítimo:</strong> para melhoria dos serviços e segurança</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">5. Partilha de Dados</h2>
        <p className="text-muted-foreground mb-4">
          Os seus dados pessoais podem ser partilhados com:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li>Empresas de transporte para entrega de encomendas</li>
          <li>Entidades processadoras de pagamentos</li>
          <li>Autoridades públicas, quando legalmente exigido</li>
          <li>Prestadores de serviços técnicos (alojamento, email, etc.)</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          Não vendemos nem alugamos os seus dados pessoais a terceiros.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">6. Direitos dos Titulares dos Dados</h2>
        <p className="text-muted-foreground mb-4">
          Nos termos do RGPD, tem os seguintes direitos:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li><strong>Direito de acesso:</strong> obter informação sobre os dados tratados</li>
          <li><strong>Direito de retificação:</strong> corrigir dados inexatos ou incompletos</li>
          <li><strong>Direito de apagamento:</strong> solicitar a eliminação dos seus dados</li>
          <li><strong>Direito à limitação:</strong> restringir o tratamento dos seus dados</li>
          <li><strong>Direito à portabilidade:</strong> receber os seus dados em formato estruturado</li>
          <li><strong>Direito de oposição:</strong> opor-se ao tratamento para marketing</li>
        </ul>
        <p className="text-muted-foreground mb-4">
          Para exercer qualquer destes direitos, contacte-nos através do email 
          <strong> privacidade@techcommerce.pt</strong>.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">7. Segurança dos Dados</h2>
        <p className="text-muted-foreground mb-4">
          Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados 
          pessoais contra acesso não autorizado, alteração, divulgação ou destruição. 
          Estas medidas incluem encriptação de dados, controlos de acesso e monitorização 
          regular dos nossos sistemas.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">8. Período de Conservação</h2>
        <p className="text-muted-foreground mb-4">
          Os dados pessoais são conservados durante o tempo necessário para cumprir as 
          finalidades para as quais foram recolhidos, incluindo obrigações legais. 
          Os dados fiscais são conservados durante o período legalmente exigido (10 anos).
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">9. Cookies</h2>
        <p className="text-muted-foreground mb-4">
          O nosso website utiliza cookies para melhorar a experiência do utilizador. 
          Para mais informação, consulte a nossa <Link href="?page=cookies" className="text-primary hover:underline">Política de Cookies</Link>.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">10. Alterações à Política de Privacidade</h2>
        <p className="text-muted-foreground mb-4">
          Podemos atualizar esta Política de Privacidade periodicamente. 
          Recomendamos que consulte esta página regularmente.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">11. Autoridade de Controlo</h2>
        <p className="text-muted-foreground mb-4">
          Caso considere que o tratamento dos seus dados pessoais viola o RGPD, 
          tem o direito de apresentar uma reclamação junto da Comissão Nacional de Proteção de Dados (CNPD):
        </p>
        <div className="bg-slate-50 p-4 rounded-lg mt-4">
          <p className="text-sm text-muted-foreground">
            <strong>Comissão Nacional de Proteção de Dados</strong><br />
            Av. D. Carlos I, 134 - 1.º<br />
            1200-651 Lisboa<br />
            <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              www.cnpd.pt
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function LivroReclamacoes() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" />
          Livro de Reclamações
        </CardTitle>
        <CardDescription>Registe a sua reclamação oficial</CardDescription>
      </CardHeader>
      <CardContent>
        <Separator className="mb-6" />
        
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6">
          <p className="text-amber-800 text-sm">
            <strong>Importante:</strong> De acordo com a legislação portuguesa (Decreto-Lei n.º 156/2005), 
            os consumidores podem apresentar reclamações através do Livro de Reclamações Eletrónico.
          </p>
        </div>

        <p className="text-muted-foreground mb-4">
          A TechCommerce está empenhada em prestar um serviço de qualidade e em resolver 
          qualquer situação de insatisfação dos seus clientes. Se tiver alguma reclamação 
          a apresentar, pode fazê-lo através das seguintes vias:
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">1. Contacto Direto</h3>
        <p className="text-muted-foreground mb-4">
          Recomendamos que entre em contacto connosco primeiro para tentarmos resolver 
          a situação de forma amigável:
        </p>
        <div className="bg-slate-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4" /> <strong>suporte@techcommerce.pt</strong>
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
            <Phone className="h-4 w-4" /> <strong>+351 21 123 4567</strong>
          </p>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">2. Livro de Reclamações Eletrónico</h3>
        <p className="text-muted-foreground mb-4">
          Caso pretenda apresentar uma reclamação oficial, pode utilizar o Livro de Reclamações 
          Eletrónico disponibilizado pelo Governo de Portugal:
        </p>

        <a 
          href="https://www.livroreclamacoes.pt/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors mb-6"
        >
          <ExternalLink className="h-5 w-5" />
          Aceder ao Livro de Reclamações
        </a>

        <div className="bg-slate-50 p-6 rounded-lg">
          <h4 className="font-semibold mb-3">Informação Necessária para Reclamação</h4>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li>• Nome completo e NIF do reclamante</li>
            <li>• Morada e contactos (telefone, email)</li>
            <li>• Descrição detalhada da reclamação</li>
            <li>• Identificação do produto ou serviço em causa</li>
            <li>• Número de encomenda ou reparação (se aplicável)</li>
            <li>• Pretensão do reclamante</li>
          </ul>
        </div>

        <div className="mt-6 p-4 border rounded-lg">
          <h4 className="font-semibold mb-2">Acompanhamento da Reclamação</h4>
          <p className="text-sm text-muted-foreground">
            Após a apresentação da reclamação através do livro eletrónico, receberá um 
            número de registo que permite acompanhar o estado da mesma. A TechCommerce 
            compromete-se a responder a todas as reclamações no prazo legalmente estabelecido.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ResolucaoLitigios() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Resolução de Litígios
        </CardTitle>
        <CardDescription>Resolução alternativa de litígios de consumo</CardDescription>
      </CardHeader>
      <CardContent>
        <Separator className="mb-6" />

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Regulamento (UE) n.º 524/2013:</strong> Em conformidade com a legislação europeia, 
            informamos que existe uma plataforma online para resolução de litígios de consumo.
          </p>
        </div>

        <p className="text-muted-foreground mb-4">
          A TechCommerce está comprometida em resolver todos os litígios de consumo de forma 
          amigável. No entanto, caso não seja possível chegar a um acordo, existem mecanismos 
          de resolução alternativa de litígios disponíveis.
        </p>

        <h3 className="text-lg font-semibold mt-6 mb-3">1. Plataforma de Resolução de Litígios Online</h3>
        <p className="text-muted-foreground mb-4">
          A Comissão Europeia disponibiliza uma plataforma online para resolução de litígios 
          de consumo, que pode ser acedida através do seguinte endereço:
        </p>
        
        <a 
          href="https://ec.europa.eu/consumers/odr/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors mb-6"
        >
          <ExternalLink className="h-5 w-5" />
          Plataforma ODR - Comissão Europeia
        </a>

        <h3 className="text-lg font-semibold mt-6 mb-3">2. Centro Nacional de Informação e Arbitragem de Conflitos de Consumo</h3>
        <p className="text-muted-foreground mb-4">
          Em Portugal, pode recorrer ao Centro Nacional de Informação e Arbitragem de Conflitos 
          de Consumo (CNIACC), que é o organismo oficial para resolução alternativa de litígios:
        </p>

        <div className="bg-slate-50 p-6 rounded-lg mb-6">
          <h4 className="font-semibold mb-2">CNIACC - Centro Nacional de Informação e Arbitragem de Conflitos de Consumo</h4>
          <p className="text-sm text-muted-foreground space-y-1">
            <strong>Morada:</strong> Rua do Alecrim, n.º 54, 2.º andar<br />
            <strong>Localidade:</strong> 1200-018 Lisboa<br />
            <strong>Telefone:</strong> +351 21 384 28 00<br />
            <strong>Email:</strong> cniacc@centroarbitragemconflitos.pt<br />
            <strong>Website:</strong> <a href="https://cniacc.ministrojustica.pt/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://cniacc.ministrojustica.pt/</a>
          </p>
        </div>

        <a 
          href="https://cniacc.ministrojustica.pt/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors mb-6"
        >
          <ExternalLink className="h-5 w-5" />
          Aceder ao CNIACC
        </a>

        <h3 className="text-lg font-semibold mt-6 mb-3">3. Centros de Arbitragem</h3>
        <p className="text-muted-foreground mb-4">
          Existem vários centros de arbitragem em Portugal onde pode apresentar o seu litígio:
        </p>
        <ul className="text-sm text-muted-foreground space-y-2 mb-6">
          <li>• <strong>CIAB - Centro de Informação, Mediação e Arbitragem de Conflitos de Consumo do Algarve</strong></li>
          <li>• <strong>CIAB - Centro de Arbitragem de Braga</strong></li>
          <li>• <strong>CIALP - Centro de Informação, Arbitragem e Defesa do Consumidor da Lourinhã</strong></li>
          <li>• <strong>CAVC - Centro de Arbitragem de Conflitos de Consumo da Região do Vale do Ave</strong></li>
        </ul>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
          <h4 className="font-semibold text-green-800 mb-2">Vantagens da Arbitragem</h4>
          <ul className="text-green-700 text-sm space-y-1">
            <li>✓ Processo gratuito para o consumidor</li>
            <li>✓ Decisão vincativa para ambas as partes</li>
            <li>✓ Processo mais rápido que os tribunais</li>
            <li>✓ Sem necessidade de advogado</li>
          </ul>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">4. Contacte-nos Primeiro</h3>
        <p className="text-muted-foreground mb-4">
          Antes de iniciar qualquer processo de litígio, recomendamos que entre em contacto 
          connosco. Estamos disponíveis para resolver qualquer questão de forma amigável:
        </p>
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4" /> <strong>suporte@techcommerce.pt</strong>
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Phone className="h-4 w-4" /> <strong>+351 21 123 4567</strong>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function PoliticaCookies() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl">Política de Cookies</CardTitle>
        <CardDescription>Informação sobre o uso de cookies no nosso website</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <Separator className="mb-6" />
        
        <h2 className="text-lg font-semibold mt-6 mb-3">1. O que são Cookies?</h2>
        <p className="text-muted-foreground mb-4">
          Cookies são pequenos ficheiros de texto que são armazenados no seu dispositivo quando 
          visita um website. São amplamente utilizados para fazer os websites funcionarem de 
          forma mais eficiente e para fornecer informações aos proprietários do site.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Tipos de Cookies Utilizados</h2>
        
        <h3 className="font-semibold mt-4 mb-2">Cookies Essenciais</h3>
        <p className="text-muted-foreground mb-4">
          São necessários para o funcionamento do website e não podem ser desativados. 
          Incluem cookies de sessão, autenticação e segurança.
        </p>

        <h3 className="font-semibold mt-4 mb-2">Cookies de Desempenho</h3>
        <p className="text-muted-foreground mb-4">
          Permitem-nos contar visitas e fontes de tráfego para medir e melhorar o desempenho 
          do nosso site. Não identificam visitantes individuais.
        </p>

        <h3 className="font-semibold mt-4 mb-2">Cookies de Funcionalidade</h3>
        <p className="text-muted-foreground mb-4">
          Permitem lembrar as suas preferências (como idioma, região) para proporcionar 
          uma experiência mais personalizada.
        </p>

        <h3 className="font-semibold mt-4 mb-2">Cookies de Marketing</h3>
        <p className="text-muted-foreground mb-4">
          São utilizados para rastrear visitantes em websites. A intenção é mostrar anúncios 
          relevantes e envolventes para o utilizador individual.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Gestão de Cookies</h2>
        <p className="text-muted-foreground mb-4">
          Pode gerir as suas preferências de cookies através das definições do seu browser. 
          Note que desativar certos cookies pode afetar a funcionalidade do website.
        </p>

        <div className="bg-slate-50 p-4 rounded-lg mt-6">
          <h4 className="font-semibold mb-2">Como Gerir Cookies nos Browsers</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Chrome:</strong> Definições → Privacidade e segurança → Cookies</li>
            <li>• <strong>Firefox:</strong> Opções → Privacidade e Segurança → Cookies</li>
            <li>• <strong>Safari:</strong> Preferências → Privacidade → Cookies</li>
            <li>• <strong>Edge:</strong> Definições → Cookies e permissões do site</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

function PoliticaGarantia() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl">Política de Garantia</CardTitle>
        <CardDescription>Condições de garantia dos produtos vendidos</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <Separator className="mb-6" />
        
        <h2 className="text-lg font-semibold mt-6 mb-3">1. Garantia Legal</h2>
        <p className="text-muted-foreground mb-4">
          Nos termos do Decreto-Lei n.º 67/98, de 18 de março, todos os produtos vendidos 
          beneficiam de uma garantia legal de conformidade de:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li><strong>2 anos</strong> para produtos novos</li>
          <li><strong>1 ano</strong> para produtos recondicionados ou em segunda mão</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. O que a Garantia Cobre</h2>
        <p className="text-muted-foreground mb-4">
          A garantia cobre defeitos de fabrico e de materiais que se manifestem durante 
          o período de garantia, desde que o produto tenha sido utilizado nas condições 
          normais de uso.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. O que a Garantia Não Cobre</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li>Danos causados por uso indevido, negligência ou acidente</li>
          <li>Danos causados por tentativas de reparação por terceiros não autorizados</li>
          <li>Desgaste normal de peças consumíveis (baterias, cabos, etc.)</li>
          <li>Danos causados por agentes externos (água, fogo, etc.)</li>
          <li>Software ou dados instalados pelo utilizador</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. Como Acionar a Garantia</h2>
        <p className="text-muted-foreground mb-4">
          Para acionar a garantia, contacte-nos através do email <strong>garantia@techcommerce.pt</strong> 
          ou telefone <strong>+351 21 123 4567</strong>, indicando:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li>Número da fatura ou encomenda</li>
          <li>Descrição do problema</li>
          <li>Fotos do defeito (se possível)</li>
        </ul>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mt-6">
          <h4 className="font-semibold text-green-800 mb-2">Direitos do Consumidor</h4>
          <p className="text-green-700 text-sm">
            Em caso de falta de conformidade, o consumidor tem direito à reparação ou substituição 
            do produto, ou, se isso não for possível, à redução do preço ou resolução do contrato.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function PoliticaDevolucoes() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl">Política de Devoluções</CardTitle>
        <CardDescription>Condições para devolução e troca de produtos</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <Separator className="mb-6" />
        
        <h2 className="text-lg font-semibold mt-6 mb-3">1. Direito de Livre Resolução</h2>
        <p className="text-muted-foreground mb-4">
          Nos termos do Decreto-Lei n.º 24/2014, tem um prazo de <strong>14 dias</strong> para 
          devolver o produto, a contar da data de receção, sem necessidade de justificar a decisão.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Condições de Devolução</h2>
        <p className="text-muted-foreground mb-4">
          Para que a devolução seja aceite, o produto deve:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li>Estar na embalagem original e completo</li>
          <li>Não apresentar sinais de uso excessivo</li>
          <li>Incluir todos os acessórios e documentação</li>
          <li>Ter o selo de garantia intacto (se aplicável)</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Exclusões</h2>
        <p className="text-muted-foreground mb-4">
          O direito de livre resolução não se aplica a:
        </p>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li>Produtos personalizados ou feitos por encomenda</li>
          <li>Produtos selados que não possam ser devolvidos por razões de saúde ou higiene</li>
          <li>Produtos que, pela sua natureza, se misturem indissociavelmente com outros</li>
          <li>Software selado aberto após a entrega</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. Processo de Devolução</h2>
        <ol className="list-decimal list-inside text-muted-foreground space-y-2 mb-4">
          <li>Contacte-nos através de <strong>devolucoes@techcommerce.pt</strong></li>
          <li>Receberá um número de autorização de devolução (RMA)</li>
          <li>Embale o produto adequadamente com o número RMA visível</li>
          <li>Envie para a morada indicada</li>
          <li>Reembolso em até 14 dias após receção e verificação</li>
        </ol>

        <h2 className="text-lg font-semibold mt-6 mb-3">5. Custos de Devolução</h2>
        <p className="text-muted-foreground mb-4">
          Os custos de envio da devolução são da responsabilidade do cliente, exceto em caso 
          de produto defeituoso ou não conforme.
        </p>
      </CardContent>
    </Card>
  )
}

function PoliticaEnvio() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Link href="/legal" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar
          </Link>
        </div>
        <CardTitle className="text-2xl">Política de Envio</CardTitle>
        <CardDescription>Informação sobre métodos e custos de envio</CardDescription>
      </CardHeader>
      <CardContent className="prose prose-slate max-w-none">
        <Separator className="mb-6" />
        
        <h2 className="text-lg font-semibold mt-6 mb-3">1. Métodos de Envio</h2>
        <div className="bg-slate-50 p-4 rounded-lg mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Método</th>
                <th className="text-left py-2">Prazo</th>
                <th className="text-right py-2">Custo</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b">
                <td className="py-2">Envio Normal</td>
                <td className="py-2">3-5 dias úteis</td>
                <td className="text-right py-2">€4,99</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">Envio Expresso</td>
                <td className="py-2">1-2 dias úteis</td>
                <td className="text-right py-2">€9,99</td>
              </tr>
              <tr>
                <td className="py-2">Levantamento em Loja</td>
                <td className="py-2">24h</td>
                <td className="text-right py-2">Grátis</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold mt-6 mb-3">2. Envio Gratuito</h2>
        <p className="text-muted-foreground mb-4">
          Oferecemos envio gratuito em encomendas superiores a <strong>€50</strong> para Portugal Continental.
        </p>

        <h2 className="text-lg font-semibold mt-6 mb-3">3. Zonas de Envio</h2>
        <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-4">
          <li><strong>Portugal Continental:</strong> preços indicados acima</li>
          <li><strong>Ilhas (Açores e Madeira):</strong> +€5 ao valor base</li>
          <li><strong>Espanha:</strong> €6,99 (normal) / €12,99 (expresso)</li>
          <li><strong>Resto da Europa:</strong> consultar na finalização da encomenda</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6 mb-3">4. Acompanhamento de Encomenda</h2>
        <p className="text-muted-foreground mb-4">
          Após o envio, receberá um email com o número de rastreamento para acompanhar 
          a sua encomenda em tempo real.
        </p>
      </CardContent>
    </Card>
  )
}
