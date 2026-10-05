-- Additive foundation. Existing business tables are deliberately not exposed in Child.
BEGIN;
CREATE TABLE public.tenants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 kind text NOT NULL CHECK (kind IN ('master','child')),
 slug text NOT NULL UNIQUE CHECK (slug = lower(slug)),
 status text NOT NULL CHECK (status IN ('pending','active','suspended','terminated')),
 display_name text NOT NULL, hero_title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '',
 logo_url text NOT NULL DEFAULT '', whatsapp text NOT NULL DEFAULT '', config_version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX tenants_one_master ON public.tenants(kind) WHERE kind='master';
INSERT INTO public.tenants(id,kind,slug,status,display_name)
 VALUES ('00000000-0000-4000-8000-000000000001','master','master','active','LOXER');
CREATE TABLE public.partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id),
 owner_user_id uuid NOT NULL REFERENCES public.users_meta(id), business_name text NOT NULL
);
CREATE TABLE public.tenant_memberships (
 tenant_id uuid NOT NULL REFERENCES public.tenants(id), user_id uuid NOT NULL REFERENCES public.users_meta(id),
 role text NOT NULL CHECK(role IN ('partner_owner','partner_admin','partner_staff','seeker','employer','freelancer','customer')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
 display_name text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,user_id)
);
CREATE INDEX tenant_memberships_user ON public.tenant_memberships(user_id,status);
CREATE INDEX tenant_memberships_page ON public.tenant_memberships(tenant_id,joined_at,user_id);
CREATE TABLE public.tenant_sessions (
 token_hash text PRIMARY KEY, tenant_id uuid NOT NULL, user_id uuid NOT NULL, expires_at timestamptz NOT NULL,
 FOREIGN KEY(tenant_id,user_id) REFERENCES public.tenant_memberships(tenant_id,user_id)
);
CREATE INDEX tenant_sessions_expiry ON public.tenant_sessions(expires_at);
CREATE TABLE public.tenant_audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES public.tenants(id),
 actor_id uuid NOT NULL, action text NOT NULL, resource_id text NOT NULL, reason text NOT NULL DEFAULT '',
 request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tenant_audit_page ON public.tenant_audit_events(tenant_id,created_at);

-- No browser policies: all data passes through the authenticated server boundary.
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tenants, public.partners, public.tenant_memberships, public.tenant_sessions, public.tenant_audit_events FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tenants, public.partners, public.tenant_memberships, public.tenant_sessions TO service_role;
GRANT SELECT,INSERT ON public.tenant_audit_events TO service_role;

CREATE FUNCTION public.tenant_audit_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'immutable audit'; END;
$$;
CREATE TRIGGER tenant_audit_no_change BEFORE UPDATE OR DELETE ON public.tenant_audit_events
 FOR EACH ROW EXECUTE FUNCTION public.tenant_audit_immutable();

-- Atomic state change + audit, callable only from the service-role server.
CREATE FUNCTION public.tenant_platform_mutate(operation text, target_tenant uuid, actor uuid, request_id uuid, payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE t public.tenants; owner public.users_meta; actor_role text; new_id uuid; event_action text;
BEGIN
 IF operation IN ('create','status') THEN
   SELECT role INTO actor_role FROM public.users_meta WHERE id=actor AND NOT coalesce(is_banned,false);
   IF actor_role NOT IN ('admin','superadmin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 END IF;
 IF operation='create' THEN
   IF NOT (payload->>'slug' ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$') THEN RAISE EXCEPTION 'invalid slug'; END IF;
   SELECT * INTO owner FROM public.users_meta WHERE id=(payload->>'owner_user_id')::uuid AND NOT coalesce(is_banned,false);
   IF NOT FOUND THEN RAISE EXCEPTION 'invalid owner'; END IF;
   INSERT INTO public.tenants(kind,slug,status,display_name,hero_title)
     VALUES ('child',payload->>'slug','pending',payload->>'business_name','Bangun masa depan bersama '||(payload->>'business_name)) RETURNING * INTO t;
   INSERT INTO public.partners(tenant_id,owner_user_id,business_name) VALUES(t.id,owner.id,payload->>'business_name');
   INSERT INTO public.tenant_memberships(tenant_id,user_id,role,display_name,email) VALUES(t.id,owner.id,'partner_owner',payload->>'business_name',owner.email);
   event_action := 'partner.created';
 ELSE
   SELECT * INTO t FROM public.tenants WHERE id=target_tenant AND kind='child' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'tenant missing'; END IF;
   IF operation='status' THEN
     IF t.status='terminated' OR payload->>'status' NOT IN ('active','suspended','terminated') OR length(coalesce(payload->>'reason',''))=0 THEN RAISE EXCEPTION 'invalid transition'; END IF;
     UPDATE public.tenants SET status=payload->>'status',config_version=config_version+1 WHERE id=t.id RETURNING * INTO t;
     event_action := 'partner.'||t.status;
   ELSIF operation='branding' THEN
     IF t.status<>'active' OR NOT EXISTS(SELECT 1 FROM public.tenant_memberships WHERE tenant_id=t.id AND user_id=actor AND status='active' AND role IN ('partner_owner','partner_admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
     UPDATE public.tenants SET
       display_name=coalesce(payload->>'display_name',display_name), hero_title=coalesce(payload->>'hero_title',hero_title),
       description=coalesce(payload->>'description',description), logo_url=coalesce(payload->>'logo_url',logo_url),
       whatsapp=coalesce(payload->>'whatsapp',whatsapp),config_version=config_version+1
       WHERE id=t.id RETURNING * INTO t;
     event_action := 'branding.updated';
   ELSIF operation='register' THEN
     IF t.status<>'active' OR payload->>'role' NOT IN ('seeker','employer','freelancer','customer') THEN RAISE EXCEPTION 'invalid registration'; END IF;
     IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND raw_app_meta_data->>'partner_tenant_id'=t.id::text AND lower(email)=payload->>'email') THEN RAISE EXCEPTION 'invalid identity'; END IF;
     -- users_meta retains the existing global role constraint; service role is kept in membership.
     INSERT INTO public.users_meta(id,email,role) VALUES(actor,payload->>'email',CASE WHEN payload->>'role' IN ('customer','freelancer') THEN 'seeker' ELSE payload->>'role' END)
       ON CONFLICT(id) DO NOTHING;
     INSERT INTO public.tenant_memberships(tenant_id,user_id,role,display_name,email)
       VALUES(t.id,actor,payload->>'role',payload->>'display_name',payload->>'email');
     event_action := 'member.registered';
   ELSE RAISE EXCEPTION 'invalid operation';
   END IF;
 END IF;
 INSERT INTO public.tenant_audit_events(tenant_id,actor_id,action,resource_id,reason,request_id)
   VALUES(t.id,actor,event_action,CASE WHEN operation='register' THEN actor::text ELSE t.id::text END,coalesce(payload->>'reason',''),request_id);
 RETURN to_jsonb(t);
END;
$$;
REVOKE ALL ON FUNCTION public.tenant_platform_mutate(text,uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_platform_mutate(text,uuid,uuid,uuid,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.tenant_audit_immutable() FROM PUBLIC, anon, authenticated;
COMMIT;
