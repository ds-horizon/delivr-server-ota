// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as api from "./api";
import { S3 } from "aws-sdk"; // Amazon S3
import { SecretsManager } from "aws-sdk";
import * as awsRDS from "aws-sdk/clients/rds";
import { AzureStorage } from "./storage/azure-storage";
import { fileUploadMiddleware } from "./file-upload-manager";
import { JsonStorage } from "./storage/json-storage";
import { RedisManager } from "./redis-manager";
import { MemcachedManager } from "./memcached-manager";
import { Storage } from "./storage/storage";
import { Response } from "express";
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || "<your-s3-bucket-name>";
const RDS_DB_INSTANCE_IDENTIFIER = process.env.RDS_DB_INSTANCE_IDENTIFIER || "<your-rds-instance>";
const SECRETS_MANAGER_SECRET_ID = process.env.SECRETS_MANAGER_SECRET_ID || "<your-secret-id>";

const s3 = new S3(); // Create an S3 instance
const secretsManager = new SecretsManager(); // Secrets Manager instance for fetching credentials

import * as bodyParser from "body-parser";
const domain = require("express-domain-middleware");
import * as express from "express";
const csrf = require('lusca').csrf;
import { S3Storage } from "./storage/aws-storage";
import { GCPStorage } from "./storage/gcp-storage";

interface Secret {
  id: string;
  value: string;
}

function bodyParserErrorHandler(err: any, req: express.Request, res: express.Response, next: Function): void {
  if (err) {
    if (err.message === "invalid json" || (err.name === "SyntaxError" && ~err.stack.indexOf("body-parser"))) {
      req.body = null;
      next();
    } else {
      next(err);
    }
  } else {
    next();
  }
}

export function start(done: (err?: any, server?: express.Express, storage?: Storage) => void, useJsonStorage: boolean=false): void {
  let storage: Storage;
  let isSecretsManagerConfigured: boolean;
  let secretValue: any;

  Promise.resolve(<void>(null))
    .then(async () => {
      console.log(`[Storage] STORAGE_TYPE: ${process.env.STORAGE_TYPE}`);
      // Option A: Backward compatibility - deprecate useJsonStorage gradually
      // If useJsonStorage is true, use JSON storage, otherwise check STORAGE_TYPE env var
      const storageType = useJsonStorage ? 'json' : (process.env.STORAGE_TYPE || 'aws');
      
      console.log(`[Storage] Initializing storage provider: ${storageType}`);
      
      switch (storageType.toLowerCase()) {
        case 'aws':
        case 's3':
          storage = new S3Storage();
          break;
        case 'gcp':
        case 'gcs':
          storage = new GCPStorage();
          break;
        case 'json':
        case 'file':
          storage = new JsonStorage();
          break;
        default:
          throw new Error(`Unsupported storage type: ${storageType}. Supported types: aws, gcp, json`);
      }
      
      console.log(`[Storage] Successfully initialized ${storageType} storage provider`);
    })
    .then(() => {
      const app = express();
      // Trust a specific number of proxy hops (safer than boolean true).
      // Configure via TRUST_PROXY_HOPS; default to 1 when sitting behind a single proxy/ELB.
      const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || "1", 10);
      app.set("trust proxy", trustProxyHops);
      console.log(`Trust proxy hops: ${trustProxyHops}`);
      const auth = api.auth({ storage: storage });
      const redisManager = new RedisManager();
      const memcachedManager = new MemcachedManager();

      // First, to wrap all requests and catch all exceptions.
      app.use(domain);

      // Monkey-patch res.send and res.setHeader to no-op after the first call and prevent "already sent" errors.
      app.use((req: express.Request, res: express.Response, next: (err?: any) => void): any => {
        const originalSend = res.send;
        const originalSetHeader = res.setHeader;
        // req.user = {
        //   id: "default",
        // }
        res.setHeader = (name: string, value: string | number | readonly string[]): Response => {
          if (!res.headersSent) {
            originalSetHeader.apply(res, [name, value]);
          }

          return {} as Response;
        };

        res.send = (body: any) => {
          if (res.headersSent) {
            return res;
          }

          return originalSend.apply(res, [body]);
        };

        next();
      });

      if (process.env.LOGGING) {
        app.use((req: express.Request, res: express.Response, next: (err?: any) => void): any => {
          console.log(); // Newline to mark new request
          console.log(`[REST] Received ${req.method} request at ${req.originalUrl}`);
          next();
        });
      }

      // Enforce a timeout on all requests.
      app.use(api.requestTimeoutHandler());

      // Before other middleware which may use request data that this middleware modifies.
      app.use(api.inputSanitizer());

      //app.use(csrf());

      // body-parser must be before the Application Insights router.
      app.use(bodyParser.urlencoded({ extended: true }));
      const jsonOptions: any = { limit: "10kb", strict: true };
      if (process.env.LOG_INVALID_JSON_REQUESTS === "true") {
        jsonOptions.verify = (req: express.Request, res: express.Response, buf: Buffer, encoding: string) => {
          if (buf && buf.length) {
            (<any>req).rawBody = buf.toString();
          }
        };
      }

      app.use(bodyParser.json(jsonOptions));

      // If body-parser throws an error, catch it and set the request body to null.
      app.use(bodyParserErrorHandler);

      // Before all other middleware to ensure all requests are tracked.
      // app.use(appInsights.router());

      app.get("/", (req: express.Request, res: express.Response, next: (err?: Error) => void): any => {
        res.send("Welcome to the CodePush REST API!");
      });

      app.set("etag", false);
      app.set("views", __dirname + "/views");
      app.set("view engine", "ejs");
      app.use("/auth/images/", express.static(__dirname + "/views/images"));
      app.use(api.headers({ origin: process.env.CORS_ORIGIN || "http://localhost:4000" }));
      app.use(api.health({ storage: storage, redisManager: redisManager, memcachedManager: memcachedManager }));

      // Rate limiting removed: relying on CloudFront + WAF for request throttling

      if (process.env.DISABLE_ACQUISITION !== "true") {
        app.use(api.acquisition({ storage: storage, redisManager: redisManager, memcachedManager: memcachedManager }));
      }

      if (process.env.DISABLE_MANAGEMENT !== "true") {
        if (process.env.DEBUG_DISABLE_AUTH === "true") {
          app.use((req, res, next) => {
            let userId: string = "default";
            if (process.env.DEBUG_USER_ID) {
              userId = process.env.DEBUG_USER_ID;
            } else {
              console.log("No DEBUG_USER_ID environment variable configured. Using 'default' as user id");
            }

            req.user = {
              id: userId,
            };

            next();
          });
        } else {
          app.use(auth.router());
        }
        app.use(auth.authenticate, fileUploadMiddleware, api.management({ storage: storage, redisManager: redisManager }));
      } else {
        app.use(auth.router());
      }

      done(null, app, storage);
    })
    .catch((error) => {
      console.error("Error starting server:", error);
      done(error);
    });
}
