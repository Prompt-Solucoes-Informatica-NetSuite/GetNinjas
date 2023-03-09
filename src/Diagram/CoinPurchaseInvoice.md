## Reference:
### [MermaidLive Preview](https://mermaid.live)

```mermaid

flowchart
    Start[START] 
        --> CoinPurchaseList(Coin Purchase Invoice)
        --> ListUser
        
    ListUser(List of Users and Purchased coins) 
        -->|Separate CoinPurchases by User| SummaryUser
    
    SummaryUser(Summary each User)
        --> |Collect User to work| BuildBalance
    
    BuildBalance(Calculate and make balance) 
        --> |Make balance by User| BuildInvoice(Make Invoice Transcation by Balance) 
        --> IsCreatedInvoice{Invoice created}


    IsCreatedInvoice 
        --> |Yes| UpdateCP[Update each CP with internal ID]
        --> UpdateCPFlag[Update each CP flag as finished]
        --> RemainRecord{Has Record yet?}

    IsCreatedInvoice
        --> |No| ExceptionFlow01[Update user]

    ExceptionFlow01
        --> EF01Step01
        --> EF02Step02
        --> SummaryUser

    EF01Step01(Register in CustomRecord)
    EF02Step02(Add to Queue to reprocess)

    RemainRecord 
        --> |Yes| SummaryUser

    RemainRecord
        --> |No| Finish




    Finish[FINISH]

```