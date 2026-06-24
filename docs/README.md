# Documentação de planejamento — Back-office ZEC

Sistema corporativo de **Contabilidade + Reporting + RH + Gestão de Pagamentos** para uma empresa que opera tesouraria e folha em **ZEC (Zcash)**, usando **viewing keys** para auditoria e o **campo de memo encriptado** do Zcash para anexar metadados estruturados aos pagamentos (a metáfora do `MEMO` de um cheque de papel).

> Status: **fase de design**. Nenhum código de implementação foi escrito ainda — aguardando alinhamento das decisões em [03-critica-e-riscos.md](03-critica-e-riscos.md) §E.

## Índice

| Doc                                              | Conteúdo                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [01-arquitetura.md](01-arquitetura.md)           | Design completo: princípios, módulos, modelo de dados, fluxos end-to-end, esquema do memo, stack.                                                                              |
| [02-fatos-zcash.md](02-fatos-zcash.md)           | Fatos técnicos verificados na pesquisa (memo, viewing keys, zallet, ZIP-321, FROST, contabilidade) + fontes + lacunas.                                                         |
| [03-critica-e-riscos.md](03-critica-e-riscos.md) | Crítica adversarial: furos do design (fees, change, expiry, UFVK centralizada, what-you-see-is-what-you-sign), riscos de privacidade/compliance/segurança e perguntas abertas. |

## Stack Zcash existente da empresa (premissa)

Node **Zebra** · carteira **zallet** (full-node, sobre librustzcash) · **FROST/zkool** (assinatura threshold) · carteira de referência **ZODL** (= Zashi rebrandeada, 2026).

## Princípio inegociável

**Nenhuma spend key no sistema.** Só viewing keys (read-only). Toda assinatura de pagamento é externa, via FROST threshold (t-de-n).
