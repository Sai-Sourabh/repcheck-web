import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../api'
import { useAuth } from '../store'
import { Logo } from '../components/Layout'
import { Button, Field, Input, Notice, PageTitle, Panel } from '../components/ui'

export default function Auth() {
  const signIn = useAuth((s) => s.signIn)
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const submit = useMutation({
    mutationFn: () => (mode === 'login' ? api.login({ email: form.email, password: form.password }) : api.register(form)),
    onSuccess: signIn,
  })

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <Logo />
      <PageTitle key={mode} className="mt-8">{mode === 'login' ? 'Log in' : 'Create your account'}</PageTitle>
      <p className="mt-2 text-mute">Track every set and see if your lifts are going up.</p>
      <Panel className="mt-6 p-4">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit.mutate() }}>
          {mode === 'register' && (
            <Field label="Name"><Input required value={form.displayName} onChange={set('displayName')} autoComplete="name" /></Field>
          )}
          <Field label="Email"><Input required type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
          <Field label={mode === 'register' ? 'Password (8 characters or more)' : 'Password'}>
            <Input required type="password" minLength={mode === 'register' ? 8 : undefined} value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </Field>
          {submit.isError && <Notice tone="error">{submit.error.message}</Notice>}
          <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
            {mode === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>
      </Panel>
      <button type="button" className="mt-4 text-left text-sm font-semibold text-accent"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); submit.reset() }}>
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </button>
    </main>
  )
}
