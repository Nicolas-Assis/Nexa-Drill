import { ShieldCheck, FileText, Lock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Termos e Privacidade | NexaDrill",
};

function Secao({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-foreground">{titulo}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Conta"
        icon={ShieldCheck}
        title="Termos e Privacidade"
        description="Termos de Uso e Política de Privacidade (LGPD) do NexaDrill"
      />

      <p className="text-xs text-muted-foreground">
        Última atualização: julho de 2026
      </p>

      {/* Termos de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Termos de Uso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Secao titulo="1. Objeto">
            <p>
              O NexaDrill é uma plataforma de gestão para profissionais e
              empresas de perfuração de poços, oferecendo orçamentos, controle
              de serviços, financeiro, cobranças e perfil público. Ao criar uma
              conta, você concorda com estes Termos.
            </p>
          </Secao>
          <Secao titulo="2. Conta e responsabilidades">
            <p>
              Você é responsável pela veracidade dos dados cadastrados, pela
              guarda das suas credenciais de acesso e por todas as atividades
              realizadas na sua conta. É proibido usar a plataforma para fins
              ilícitos ou que violem direitos de terceiros.
            </p>
          </Secao>
          <Secao titulo="3. Dados dos seus clientes">
            <p>
              Ao cadastrar clientes e serviços, você insere dados pessoais de
              terceiros. Você declara ter base legal para tratar esses dados e
              se compromete a utilizá-los apenas para a gestão dos seus próprios
              serviços, em conformidade com a legislação aplicável.
            </p>
          </Secao>
          <Secao titulo="4. Cobranças e integrações">
            <p>
              Funcionalidades de cobrança (ex.: Pix via Asaas) dependem de
              integrações de terceiros e da configuração da sua conta. O
              NexaDrill não se responsabiliza por indisponibilidades ou regras
              desses parceiros.
            </p>
          </Secao>
          <Secao titulo="5. Disponibilidade e limitação">
            <p>
              A plataforma é fornecida &quot;como está&quot;. Empregamos esforços
              razoáveis para mantê-la disponível e segura, mas não garantimos
              operação ininterrupta ou isenta de erros.
            </p>
          </Secao>
        </CardContent>
      </Card>

      {/* Política de Privacidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Política de Privacidade (LGPD)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Secao titulo="Quais dados tratamos">
            <p>
              <strong>Seus dados de cadastro:</strong> nome, e-mail, telefone,
              empresa e dados de perfil. <strong>Dados dos seus clientes:</strong>{" "}
              nome, telefone, e-mail, CPF/CNPJ e endereço, além de informações de
              orçamentos, serviços e cobranças que você registra.
            </p>
          </Secao>
          <Secao titulo="Papéis (controlador e operador)">
            <p>
              Em relação aos dados dos seus clientes, <strong>você é o
              controlador</strong> e define as finalidades do tratamento. O{" "}
              <strong>NexaDrill atua como operador</strong>, tratando os dados
              conforme suas instruções e para viabilizar o funcionamento da
              plataforma, nos termos da Lei nº 13.709/2018 (LGPD).
            </p>
          </Secao>
          <Secao titulo="Finalidade">
            <p>
              Utilizamos os dados para prestar o serviço de gestão: gerar
              orçamentos e PDFs, controlar serviços e financeiro, emitir
              cobranças e disponibilizar seu perfil público. Não vendemos seus
              dados nem os de seus clientes.
            </p>
          </Secao>
          <Secao titulo="Compartilhamento">
            <p>
              Dados podem ser compartilhados com provedores estritamente
              necessários à operação (ex.: hospedagem, e-mail transacional e
              gateway de pagamento), sempre limitados à finalidade contratada.
            </p>
          </Secao>
          <Secao titulo="Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais para proteger os
              dados, incluindo controle de acesso por conta e isolamento de
              dados entre usuários. Ainda assim, nenhum sistema é 100% imune —
              mantenha suas credenciais seguras.
            </p>
          </Secao>
          <Secao titulo="Direitos do titular">
            <p>
              Titulares de dados podem solicitar confirmação de tratamento,
              acesso, correção, anonimização, portabilidade e eliminação, nos
              limites da LGPD. Solicitações relativas aos seus clientes devem ser
              endereçadas a você (controlador); podemos apoiar tecnicamente
              quando aplicável.
            </p>
          </Secao>
          <Secao titulo="Retenção e exclusão">
            <p>
              Os dados são mantidos enquanto sua conta estiver ativa. Você pode
              excluir clientes, orçamentos e serviços a qualquer momento; a
              exclusão da conta remove os dados associados, ressalvadas
              obrigações legais de retenção.
            </p>
          </Secao>
          <Secao titulo="Contato">
            <p>
              Dúvidas sobre privacidade e proteção de dados podem ser enviadas
              pelos canais de atendimento do NexaDrill.
            </p>
          </Secao>
        </CardContent>
      </Card>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Este documento é um modelo e pode ser ajustado pela sua assessoria
        jurídica.
      </p>
    </div>
  );
}
