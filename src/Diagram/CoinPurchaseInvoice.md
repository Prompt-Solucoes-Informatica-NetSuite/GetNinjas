## Reference:
### [MermaidLive Preview](https://mermaid.live)

```mermaid

flowchart
    Start[START] 
        --> CoinPurchaseList(Listar consumo de moedas por faixa de tempo)
        --> ListUser
        
    ListUser(Listar usuários por consumo de moedas) 
        -->|Agrupar usuários por consumo| SummaryUser
    
    SummaryUser(Buscar usuário e moedas por faixa de tempo)
        --> BuildBalance
    
    BuildBalance(Calcular balanço de moedas consumidas) 
        --> |Executar balaço de consumo| BuildInvoice(Make Invoice Transcation by Balance) 
        --> BuildCompensation

    BuildCompensation(Calcular compensação de consumo)
        --> |Calcular compensação com os consumos| IsCompensationMatch

    IsCompensationMatch{Compensação correta?}

    IsCompensationMatch
        --> |Valor correto| BuildCalculation(Construir registro de compensação)
        --> IsCreatedInvoice

    IsCompensationMatch
        --> |Valor incorreto| ExceptionFlow02

    IsCreatedInvoice{Invoice created}
    IsCreatedInvoice
        --> |Sim| UpdateCP
    IsCreatedInvoice
        --> |Não| ExceptionFlow01

    UpdateCP[Atualizar Compra de Moeda]
        --> UpdateCPFlag[Atualizar FLAG de atualizado]
        --> UpdateCPInvoiceId[Adicionar ID da fatura]
        --> RemainRecord{Ainda existem\n registros?}

    ExceptionFlow01[Fluxo de exceção\n de invoice]
    ExceptionFlow01
        --> EF01Step01
        --> EF01Step02
        --> SummaryUser
    
    EF01Step01(Armazenar registros)
    EF01Step02(Adicionar fila para reprocessar)


    ExceptionFlow02[Calculo incorreto]
    ExceptionFlow02
        --> EF02Step01
        --> EF02Step02
        --> SummaryUser

    EF02Step01(Armazenar registros \nde calculo)
    EF02Step02(Alertar via e-mail)


    RemainRecord 
        --> |Sim| SummaryUser

    RemainRecord
        --> |Não| Finish




    Finish[FINISH]

```