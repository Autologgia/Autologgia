import {beforeEach, describe, expect, it, vi} from "vitest";
import {ESTIMATION_BODY_LIMIT_BYTES, MAX_TOTAL_PHOTO_BYTES} from "@/lib/estimation-photos";
import {readFormJson} from "@/lib/form-request";

const {send, forward, create} = vi.hoisted(() => ({send:vi.fn(), forward:vi.fn(), create:vi.fn()}));
vi.mock("resend", () => ({Resend: class {emails={send};}}));
vi.mock("@/lib/synergy-leads", () => ({forwardLeadToSynergy:forward}));
vi.mock("@/lib/sanity-write", () => ({sanityWriteToken:"test",writeClient:{create}}));
vi.mock("@/lib/rate-limit", () => ({checkRateLimit:()=>true}));
import {POST as estimation} from "@/app/api/estimation/route";
import {POST as contact} from "@/app/api/contact/route";

const origin="https://www.autologgia.fr";
const payload={brand:"Peugeot",model:"107",year:"2015",mileage:"90000",power:"68",fuel:"essence",transmission:"manuelle",etat:"bon",phone:"0612345678",submissionId:"ce45bf8f-af4c-46e4-8476-64bbc3d8fef3"};
function request(body: unknown, headers: Record<string,string>={}) {
  return new Request(origin+"/api/estimation",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin,...headers},body:JSON.stringify(body)});
}
function png(size:number) {
  const buffer=Buffer.alloc(size);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(buffer);
  return {filename:"photo.png",content:buffer.toString("base64")};
}
beforeEach(()=>{
  vi.clearAllMocks();vi.unstubAllEnvs();
  vi.stubEnv("RESEND_API_KEY","fake-key-for-tests");
  send.mockResolvedValue({error:null});forward.mockResolvedValue(true);create.mockResolvedValue({});
});
describe("form request boundary, all providers mocked",()=>{
  it.each([estimation,contact])("rejects missing or foreign Origin before providers",async post=>{
    for(const bad of ["","https://attacker.example"]){expect((await post(request(payload,{Origin:bad}))).status).toBe(403);}
    expect(send).not.toHaveBeenCalled();expect(forward).not.toHaveBeenCalled();
  });
  it("rejects cross-site and non-JSON requests",async()=>{
    expect((await estimation(request(payload,{"Sec-Fetch-Site":"cross-site"}))).status).toBe(403);
    expect((await estimation(request(payload,{"Content-Type":"text/plain"}))).status).toBe(415);
  });
  it("bounds bytes even without Content-Length and includes UTF-8 expansion",async()=>{
    const req=new Request(origin,{method:"POST",body:JSON.stringify({text:"é".repeat(50)})});
    const parsed=await readFormJson(req,80);
    expect(parsed.ok).toBe(false);if(!parsed.ok)expect(parsed.response.status).toBe(413);
  });
  it("rejects oversized JSON before a provider is called",async()=>{
    expect((await estimation(request({pad:"x".repeat(ESTIMATION_BODY_LIMIT_BYTES)}))).status).toBe(413);
    expect(send).not.toHaveBeenCalled();expect(forward).not.toHaveBeenCalled();
  });
  it("accepts an aggregate just under 2.5 MiB within the platform budget",async()=>{
    const photos=[png(MAX_TOTAL_PHOTO_BYTES/2),png(MAX_TOTAL_PHOTO_BYTES/2)];
    const req=request({...payload,photos});
    expect(new TextEncoder().encode(await req.clone().text()).length).toBeLessThan(ESTIMATION_BODY_LIMIT_BYTES);
    expect((await estimation(req)).status).toBe(200);
    expect(send.mock.calls[0][0].attachments).toHaveLength(2);
    expect(send.mock.calls[0][1].idempotencyKey).toBe("autologgia-estimation-"+payload.submissionId);
    expect(forward.mock.calls[0][0].idempotencyKey).toBe(payload.submissionId);
  });
  it("rejects excess total attachments without silently losing photos",async()=>{
    const response=await estimation(request({...payload,photos:[png(1400000),png(1400000)]}));
    expect(response.status).toBe(400);expect((await response.json()).error).toContain("2,5 Mo");
    expect(send).not.toHaveBeenCalled();expect(forward).not.toHaveBeenCalled();
  });
  it.each([
    [{filename:"photo.jpg",content:Buffer.from("not an image").toString("base64")}],
    [png(20),png(20),png(20),png(20),png(20)],
    [{filename:"wrong.jpg",content:png(20).content}],
    [{filename:"photo.png",content:"@@@="}],
  ].map(photos => ({photos})))("rejects invalid/count/type payload $photos",async ({photos})=>{
    expect((await estimation(request({...payload,photos}))).status).toBe(400);
    expect(send).not.toHaveBeenCalled();expect(forward).not.toHaveBeenCalled();
  });
  it("disables every external delivery in previews, including CMS writes",async()=>{
    vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("VERCEL_URL","autologgia-test.vercel.app");
    const req=new Request("https://autologgia-test.vercel.app/api/estimation",{method:"POST",headers:{"Content-Type":"application/json",Origin:"https://autologgia-test.vercel.app"},body:JSON.stringify(payload)});
    expect((await estimation(req)).status).toBe(503);
    expect(send).not.toHaveBeenCalled();expect(forward).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
  });
});
