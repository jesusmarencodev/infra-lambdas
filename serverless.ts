import type { AWS } from "@serverless/typescript";


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
      EventBus: {
        Type: "AWS::Events::EventBus",
        Properties: {
          Name: "EventBusPracticaAWSServerless01"
        }
      },
      EventRulePE: {
        Type: "AWS::Events::Rule",
        Properties: {
          //se obtiene el nombre del recurso llamado eventBus, y se llena
          //la propiedad eventBusName
          EventBusName: { "Fn::GetAtt": ["EventBus", "Name"] },
          EventPattern: {
            source: ["appointment"],
            "detail-type": ["appointment-create-pe"],
            detail:{
              status:["appointment-pe"]
            }
          },
          Name:"appointment-create-pe",
          //Targets: [{ Arn: { "Fn::GetAtt": ["SQSPE", "Arn"] }, Id: "SQSPE" }],
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
            detail:{
              status:["appointment-co"]
            }
          },
          Name:"appointment-create-co",
          //Targets: [{ Arn: { "Fn::GetAtt": ["SQSPE", "Arn"] }, Id: "SQSPE" }],
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
            detail:{
              status:["appointment-ec"]
            }
          },
          Name:"appointment-create-ec",
          //Targets: [{ Arn: { "Fn::GetAtt": ["SQSPE", "Arn"] }, Id: "SQSPE" }],
        },
      },
    }
  },
};

module.exports = serverlessConfiguration;
