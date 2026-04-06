import type { SyntheticEvent } from "react";
import type { HttpMethod, ValidationErrors } from "../types";
import { useState } from "react";
import { useRequestContext } from "../context/RequestContext";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { validateUrl, validateTimeout, validateJsonBody, MIN_TIMEOUT, MAX_TIMEOUT } from "../utils/validation";
import clsx from "clsx";


const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];
const DEFAULT_TIMEOUT = 30;

const labelClass =
  'font-mono text-[11px] font-medium tracking-widest uppercase text-zinc-500 select-none';
const fieldClass =
  'rounded-md border-teal-900 bg-transparent font-mono text-xs tracking-wide text-turquoise-500 placeholder:text-zinc-600 focus-visible:border-turquoise-500 focus-visible:ring-0 dark:bg-transparent';
const errorClass =
  'font-mono text-[11px] tracking-wide text-red-400/90';

export default function RequestComposer() {
    const { sendRequest, stage, reset } = useRequestContext();

    const [url, setUrl] = useState('');
    const [method, setMethod] = useState<HttpMethod>('GET');
    const [body, setBody] = useState('');
    const [timeoutSeconds, setTimeoutSeconds] = useState(String(DEFAULT_TIMEOUT));
    
    const [errors, setErrors] = useState<ValidationErrors>({});

    const isActive = stage === 'waiting' || stage === 'sending';
    const hasBody = method === 'POST' || method === 'PUT';

    // spec: pipeline resets to idle when composing a new request
    const handleFieldChange = () => {
        if (stage !== 'idle') reset();
    };

    const submitRequest = () => {
        const urlError = validateUrl(url);
        const timeoutError = validateTimeout(timeoutSeconds);
        const bodyError = hasBody ? validateJsonBody(body) : undefined;

        if (urlError || timeoutError || bodyError) {
          setErrors({
            url: urlError,
            timeoutSeconds: timeoutError,
            body: bodyError,
          });
          return;
        }

        setErrors({});
        const trimmedBody = body.trim();
        sendRequest({
          url,
          method,
          body: hasBody ? (trimmedBody === '' ? undefined : trimmedBody) : undefined,
          timeoutSeconds: Number(timeoutSeconds),
        });
      };

    const handleFormSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      submitRequest();
    };

      return (
        <form className="flex flex-col gap-4" onSubmit={handleFormSubmit} noValidate>
    
          {/* URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url" className={labelClass}>
              URL
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://api.example.com/endpoint"
              value={url}
              disabled={isActive}
              aria-invalid={!!errors.url}
              aria-describedby={errors.url ? 'url-error' : undefined}
              className={fieldClass}
              onChange={(e) => {
                setUrl(e.target.value);
                handleFieldChange();
              }}
            />
            {errors.url && (
              <p id="url-error" className={errorClass} role="alert">
                {errors.url}
              </p>
            )}
          </div>
    
          {/* Method + Timeout */}
          <div className="flex gap-3">
    
            {/* HTTP Method */}
            <div className="flex flex-col gap-1.5 w-36">
              <Label className={labelClass}>Method</Label>
              <Select
                value={method}
                disabled={isActive}
                onValueChange={(value) => {
                  setMethod(value as HttpMethod);
                  setErrors((prev) => ({ ...prev, body: undefined }));
                  handleFieldChange();
                }}
              >
                <SelectTrigger className={clsx(fieldClass, 'w-full h-9 px-3 tracking-widest uppercase')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
    
            {/* Timeout */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              <Label htmlFor="timeout" className={labelClass}>
                Timeout (seconds)
              </Label>
              <Input
                id="timeout"
                type="number"
                min={MIN_TIMEOUT}
                max={MAX_TIMEOUT}
                value={timeoutSeconds}
                disabled={isActive}
                aria-invalid={errors.timeoutSeconds ? true : undefined}
                aria-describedby={errors.timeoutSeconds ? 'timeout-error' : undefined}
                className={fieldClass}
                onChange={(e) => {
                  setTimeoutSeconds(e.target.value);
                  handleFieldChange();
                }}
              />
              {errors.timeoutSeconds && (
                <p id="timeout-error" className={errorClass} role="alert">
                  {errors.timeoutSeconds}
                </p>
              )}
            </div>
    
          </div>
    
          {/* Body — only for POST and PUT */}
          {hasBody && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="body" className={labelClass}>
                Request body
              </Label>
              <Textarea
                id="body"
                placeholder='{ "key": "value" }'
                rows={4}
                value={body}
                disabled={isActive}
                aria-invalid={errors.body ? true : undefined}
                aria-describedby={errors.body ? 'body-error' : undefined}
                className={clsx(fieldClass, 'min-h-22 resize-y rounded-md py-2.5')}
                onChange={(e) => {
                  setBody(e.target.value);
                  setErrors((prev) => ({ ...prev, body: undefined }));
                  handleFieldChange();
                }}
              />
              {errors.body && (
                <p id="body-error" className={errorClass} role="alert">
                  {errors.body}
                </p>
              )}
            </div>
          )}
    
          {/* Send button*/}
          <Button 
            type="submit" 
            disabled={isActive} 
            variant="playground"
          >
            {isActive ? 'Sending...' : 'Send request'}
          </Button>
    
        </form>
      );
    }