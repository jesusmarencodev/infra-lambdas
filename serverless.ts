import type { AWS } from "@serverless/typescript";
//a comment test

const serverlessConfiguration: AWS = {
  service: "infraestructure",
  frameworkVersion: "3",
  plugins: ["serverless-esbuild"],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    stage: "${opt:stage, 'dev'}",
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
    },
  },
  package: { individually: true },
  custom: {
    esbuild: {
      bundle: true,
      minify: true,
      sourcemap: true,
      exclude: ["aws-sdk"],
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
    },
  },
  resources: {
    Resources: {
      S3BucketDeploymentLambdas: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "digital-test-ttaa-jdmp-a${self:provider.stage}", //nombre del backup el qe yo quiera
        }
      },
      S3BucketMedic: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "digital-test-ttaa-medic-${self:provider.stage}", //nombre del backup el qe yo quiera
        }
      },
      SSMAPIGatewayRestApiId: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/api-gateway-rest-api-id-${self:provider.stage}",
          Type: "String",
          Value: "2191e9kay8",
        }
      },
      SSMAPIGatewayRestApiRootResourceId: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/api-gateway-rest-api-root-resource-id-${self:provider.stage}",
          Type: "String",
          Value: "6pmiw878ck",
        }
      },
      SSMS3BucketDeployment: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/s3-bucket-deployment-name-${self:provider.stage}",
          Type: "String",
          Value: {
            Ref: "S3BucketDeploymentLambdas" // la pripiedad ref me da una referencia de un recurso en este caso el nombre del bucket creado
            //que sera utilizado para llnar el value del SSN que se va a crear
          },
        }
      },
      SSMS3BucketMedic: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/s3-bucket-medic-name-${self:provider.stage}",
          Type: "String",
          Value: {
            Ref: "S3BucketMedic" // la pripiedad ref me da una referencia de un recurso en este caso el nombre del bucket creado
            //que sera utilizado para llnar el value del SSN que se va a crear
          },
        }
      },
      //SQSDQL
      SQSDLQ: {
        Type: "AWS::SQS::Queue",
        Properties: {
          MessageRetentionPeriod: 86400,//esto es en segundos 86400 equivale a 1 dia es decir 24 horas
          QueueName: "SQSDLQ-${self:provider.stage}", //nombre de la cola
          //esto es en segundos 86400 equivale a 1 dia es decir 24 horas
          VisibilityTimeout: 10 // cuantos segundos esperar hasta que aparesca en la cosa el mensaje
        }
      },
      //SSM para luego utilizarlo y llamar por su valor al SQL anterior
      SSMDLQ: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/sql-dlq-deployment-name-${self:provider.stage}",
          Type: "String",
          Value: { "Fn::GetAtt": ["SQSDLQ", "Arn"] },
        },
      },
      //SQS PERU
      SQSPE: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "SQS_PE_${self:provider.stage}", //nombre de la cola
          //RedriveAllowPolicy esta propiedad enviara a otra cola los mensajes que no
          //se procecen, los enviaremos a la cola DLQ que tenemos
          RedrivePolicy: {
            deadLetterTargetArn: { "Fn::GetAtt": ["SQSDLQ", "Arn"] },
            //con la propiedad maxReceiveCount le decimos despues de cuantos intentos lo consideraremos fallido el mensaje
            maxReceiveCount: 1
          }
        }
      },
      SQSCO: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "SQS_CO_${self:provider.stage}", //nombre de la cola
          //RedriveAllowPolicy esta propiedad enviara a otra cola los mensajes que no
          //se procecen, los enviaremos a la cola DLQ que tenemos
          RedrivePolicy: {
            deadLetterTargetArn: { "Fn::GetAtt": ["SQSDLQ", "Arn"] },
            //con la propiedad maxReceiveCount le decimos despues de cuantos intentos lo consideraremos fallido el mensaje
            maxReceiveCount: 1
          }
        }
      },
      SQSEC: {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: "SQS_EC_${self:provider.stage}", //nombre de la cola
          //RedriveAllowPolicy esta propiedad enviara a otra cola los mensajes que no
          //se procecen, los enviaremos a la cola DLQ que tenemos
          RedrivePolicy: {
            deadLetterTargetArn: { "Fn::GetAtt": ["SQSDLQ", "Arn"] },
            //con la propiedad maxReceiveCount le decimos despues de cuantos intentos lo consideraremos fallido el mensaje
            maxReceiveCount: 1
          }
        }
      },
      //SSM cola de peru
      SSMSQSPE: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/sqs-pe-arn-${self:provider.stage}",
          Type: "String",
          Value: { "Fn::GetAtt": ["SQSPE", "Arn"] },
        },
      },
      SSMSQSCO: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/sqs-co-arn-${self:provider.stage}",
          Type: "String",
          Value: { "Fn::GetAtt": ["SQSCO", "Arn"] },
        },
      },
      SSMSQSEC: {
        Type: "AWS::SSM::Parameter",
        Properties: {
          Name: "/digital/sqs-ec-arn-${self:provider.stage}",
          Type: "String",
          Value: { "Fn::GetAtt": ["SQSEC", "Arn"] },
        },
      },
      //politica de peru sqs
      EventBridgeToSQSPolicy: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          PolicyDocument: {
            Statement: [
              {
                Effect: "Allow",
                //events.amazon.com es el event brid de cuentra cuenta
                Principal: { Service: "events.amazonaws.com" },// a quien le dio permiso
                Action: "sqs:*",//le decimos que puede enviar mensajes
                // le estamos diciendo que añada la politica al sqs de peru
                Resource: { "Fn::GetAtt": ["SQSPE", "Arn"] },
              },
            ],
          },
          //a que recursos vamos a unir esta politica, en este caso al SQSPE
          Queues: [{ Ref: "SQSPE" }],
        },
      },
      //politica de colombia sqs
      EventBridgeToSQSCOPolicy: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          PolicyDocument: {
            Statement: [
              {
                Effect: "Allow",
                //events.amazon.com es el event brid de cuentra cuenta
                Principal: { Service: "events.amazonaws.com" },// a quien le dio permiso
                Action: "sqs:*",//le decimos que puede enviar mensajes
                // le estamos diciendo que añada la politica al sqs de peru
                Resource: { "Fn::GetAtt": ["SQSCO", "Arn"] },
              },
            ],
          },
          //a que recursos vamos a unir esta politica, en este caso al SQSPE
          Queues: [{ Ref: "SQSCO" }],
        },
      },
      //politica de ecuador para sqs
      EventBridgeToSQSECPolicy: {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          PolicyDocument: {
            Statement: [
              {
                Effect: "Allow",
                //events.amazon.com es el event brid de cuentra cuenta
                Principal: { Service: "events.amazonaws.com" },// a quien le dio permiso
                Action: "sqs:*",//le decimos que puede enviar mensajes
                // le estamos diciendo que añada la politica al sqs de peru
                Resource: { "Fn::GetAtt": ["SQSEC", "Arn"] },
              },
            ],
          },
          //a que recursos vamos a unir esta politica, en este caso al SQSPE
          Queues: [{ Ref: "SQSEC" }],
        },
      },
      EventBus: {
        Type: "AWS::Events::EventBus",
        Properties: {
          Name: "EventBusPracticaAWSServerless01"
        }
      },
      EventRulePE: {
        Type: "AWS::Events::Rule",
        //se obtiene el nombre del recurso llamado eventBus, y se llena
        //la propiedad eventBusName
        Properties: {
          EventBusName: { "Fn::GetAtt": ["EventBus", "Name"] },
          EventPattern: {
            source: ["appointment"],
            "detail-type": ["appointment-create-pe"],
          },
          Targets: [{ Arn: { "Fn::GetAtt": ["SQSPE", "Arn"] }, Id: "SQSPE" }],
        },
      },
      EventRuleCO: {
        Type: "AWS::Events::Rule",
        Properties: {
          //se obtiene el nombre del recurso llamado eventBus, y se llena
          //la propiedad eventBusName
          EventBusName: { "Fn::GetAtt": ["EventBus", "Name"] },
          EventPattern: {
            source: ["appointment"],
            "detail-type": ["appointment-create-co"],
          },
          Targets: [{ Arn: { "Fn::GetAtt": ["SQSCO", "Arn"] }, Id: "SQSCO" }],
        },
      },
      EventRuleEC: {
        Type: "AWS::Events::Rule",
        Properties: {
          //se obtiene el nombre del recurso llamado eventBus, y se llena
          //la propiedad eventBusName
          EventBusName: { "Fn::GetAtt": ["EventBus", "Name"] },
          EventPattern: {
            source: ["appointment"],
            "detail-type": ["appointment-create-ec"],
          },
          Targets: [{ Arn: { "Fn::GetAtt": ["SQSEC", "Arn"] }, Id: "SQSEC" }],
        },
      },
      AppointmentTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "Appointment-${self:provider.stage}",
          //esta propiedad es requerida y el el modo de pago, en este caso colocamos pago por request
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S"
            },
          ],
          KeySchema: [// esto se usa para crear la llave primaria en este caso el id
            {
              AttributeName: "id",
              KeyType: "HASH"
            },
          ],
        }
      },
      MedicTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "Medic-${self:provider.stage}",
          //esta propiedad es requerida y el el modo de pago, en este caso colocamos pago por request
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S"
            },
          ],
          KeySchema: [// esto se usa para crear la llave primaria en este caso el id
            {
              AttributeName: "id",
              KeyType: "HASH"
            },
          ],
        }
      }
    }
  },
};

module.exports = serverlessConfiguration;
