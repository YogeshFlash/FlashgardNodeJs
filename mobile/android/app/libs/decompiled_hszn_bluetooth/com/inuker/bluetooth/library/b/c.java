/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.HandlerThread
 *  android.os.Looper
 *  android.os.Message
 *  android.util.SparseArray
 */
package com.inuker.bluetooth.library.b;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.os.Message;
import android.util.SparseArray;
import com.inuker.bluetooth.library.b.d;
import com.inuker.bluetooth.library.b.e;
import com.inuker.bluetooth.library.b.f;
import com.inuker.bluetooth.library.b.g;
import com.inuker.bluetooth.library.b.i;
import com.inuker.bluetooth.library.b.j;
import com.inuker.bluetooth.library.b.k;
import java.lang.reflect.Method;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.concurrent.TimeoutException;

public abstract class c
implements i,
com.inuker.bluetooth.library.e.b.b {
    private static final long a = 5000L;
    private static final int b = 1;
    private static final String c = "exception";
    private f d = com.inuker.bluetooth.library.b.f.a;
    private byte[] e;
    private SparseArray<com.inuker.bluetooth.library.b.a.e> f;
    private int g;
    private int h;
    private int i;
    private d j;
    private Handler k;
    private i l;
    private int m;
    private final j n = new j(){

        @Override
        public void a(Object ... objectArray) {
            c.this.a(false);
            com.inuker.bluetooth.library.b.a.c c2 = (com.inuker.bluetooth.library.b.a.c)objectArray[0];
            if (c2.b() != c.this.g) {
                com.inuker.bluetooth.library.e.a.e(String.format("sync packet not matched!!", new Object[0]));
                return;
            }
            if (!c.this.a(c2)) {
                com.inuker.bluetooth.library.e.a.e(String.format("sync packet repeated!!", new Object[0]));
                return;
            }
            c.this.m = c.this.g;
            c.this.g = 0;
            c.this.b();
        }
    };
    private final j o = new j(){

        @Override
        public void a(Object ... objectArray) {
            c.this.a(false);
            com.inuker.bluetooth.library.b.a.c c2 = (com.inuker.bluetooth.library.b.a.c)objectArray[0];
            if (!c.this.a(c2)) {
                com.inuker.bluetooth.library.e.a.e(String.format("dataPacket repeated!!", new Object[0]));
                return;
            }
            if (c2.b() == c.this.i) {
                c.this.b();
            } else {
                c.this.a(5000L, new k.a("WaitData"){

                    @Override
                    public void a() {
                        c.this.b();
                    }
                });
            }
        }
    };
    private final j p = new j(){

        @Override
        public void a(Object ... objectArray) {
            c.this.a(false);
            com.inuker.bluetooth.library.b.a.b b2 = (com.inuker.bluetooth.library.b.a.b)objectArray[0];
            c.this.i = b2.b();
            com.inuker.bluetooth.library.b.a.a a2 = new com.inuker.bluetooth.library.b.a.a(1);
            c.this.a(com.inuker.bluetooth.library.b.f.b);
            c.this.a(a2, new d(){

                @Override
                public void a(int n2) {
                    c.this.a(false);
                    if (n2 == 0) {
                        c.this.a(com.inuker.bluetooth.library.b.f.h);
                        c.this.g();
                    } else {
                        c.this.e();
                    }
                }
            });
        }
    };
    private final j q = new j(){

        @Override
        public void a(Object ... objectArray) {
            c.this.a(false);
            c.this.a(com.inuker.bluetooth.library.b.f.c);
            c.this.g();
        }
    };
    private final k.a r = new k.a(this.getClass().getSimpleName()){

        @Override
        public void a() {
            c.this.a(false);
            c.this.a(-2);
            c.this.e();
        }
    };
    private final j s = new j(){

        @Override
        public void a(Object ... objectArray) {
            c.this.a(false);
            com.inuker.bluetooth.library.b.a.a a2 = (com.inuker.bluetooth.library.b.a.a)objectArray[0];
            switch (a2.b()) {
                case 1: {
                    c.this.i();
                    c.this.a(com.inuker.bluetooth.library.b.f.d);
                    c.this.a(0, true);
                    break;
                }
                case 5: {
                    int n2 = a2.c();
                    if (n2 < 1 || n2 > c.this.i) break;
                    c.this.a(n2 - 1, false);
                    c.this.g();
                    break;
                }
                case 0: {
                    c.this.a(0);
                    c.this.e();
                    break;
                }
                default: {
                    c.this.a(-1);
                    c.this.e();
                }
            }
        }
    };
    private final g[] t = new g[]{new g(com.inuker.bluetooth.library.b.f.b, com.inuker.bluetooth.library.b.e.b, this.q), new g(com.inuker.bluetooth.library.b.f.c, com.inuker.bluetooth.library.b.e.e, this.s), new g(com.inuker.bluetooth.library.b.f.e, com.inuker.bluetooth.library.b.e.e, this.s), new g(com.inuker.bluetooth.library.b.f.a, com.inuker.bluetooth.library.b.e.a, this.p), new g(com.inuker.bluetooth.library.b.f.h, com.inuker.bluetooth.library.b.e.c, this.o), new g(com.inuker.bluetooth.library.b.f.f, com.inuker.bluetooth.library.b.e.c, this.n)};
    private final i u = new i(){

        @Override
        public void b(byte[] byArray, d d2) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void a(byte[] byArray) {
            c.this.d(byArray);
        }

        @Override
        public void b(byte[] byArray) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void a(byte[] byArray, d d2) {
            c.this.c(byArray, d2);
        }
    };
    private final Handler.Callback v = new Handler.Callback(){

        public boolean handleMessage(Message message) {
            switch (message.what) {
                case 1: {
                    d d2 = (d)message.obj;
                    d2.a(message.arg1);
                    break;
                }
                default: {
                    com.inuker.bluetooth.library.e.b.a.a(message.obj);
                }
            }
            return false;
        }
    };

    public c() {
        this.f = new SparseArray();
        this.l = (i)com.inuker.bluetooth.library.e.b.d.a((Object)this.u, this);
        HandlerThread handlerThread = new HandlerThread(this.getClass().getSimpleName());
        handlerThread.start();
        this.k = new Handler(handlerThread.getLooper(), this.v);
    }

    @Override
    public final void a(byte[] byArray) {
        this.l.a(byArray);
    }

    @Override
    public final void a(byte[] byArray, d d2) {
        com.inuker.bluetooth.library.e.a.b(String.format(">>> send %s", new String(byArray)));
        this.l.a(byArray, d2);
    }

    private void a(com.inuker.bluetooth.library.b.a.e e2, final d d2) {
        this.a(false);
        if (d2 == null) {
            throw new NullPointerException("callback can't be null");
        }
        if (!this.j()) {
            this.h();
        }
        final byte[] byArray = e2.d();
        com.inuker.bluetooth.library.e.a.e(String.format("%s: %s", this.f(), e2));
        com.inuker.bluetooth.library.d.a(new Runnable(){

            @Override
            public void run() {
                c.this.b(byArray, new b(d2));
            }
        });
    }

    private void a() {
        this.a(false);
        com.inuker.bluetooth.library.b.a.b b2 = new com.inuker.bluetooth.library.b.a.b(this.i);
        this.a(b2, new d(){

            @Override
            public void a(int n2) {
                c.this.a(false);
                if (n2 == 0) {
                    c.this.a(com.inuker.bluetooth.library.b.e.b, new Object[0]);
                } else {
                    c.this.a(-1);
                    c.this.e();
                }
            }
        });
    }

    private void a(int n2) {
        this.a(false);
        com.inuker.bluetooth.library.e.a.c(String.format("%s: code = %d", this.f(), n2));
        if (this.j != null) {
            this.j.a(n2);
        }
    }

    private boolean a(com.inuker.bluetooth.library.b.a.c c2) {
        this.a(false);
        if (this.f.get(c2.b()) != null) {
            return false;
        }
        if (c2.b() == this.i) {
            c2.e();
        }
        this.f.put(c2.b(), (Object)c2);
        this.h += c2.c();
        this.i();
        return true;
    }

    private void b() {
        this.a(false);
        com.inuker.bluetooth.library.e.a.c(this.f());
        this.g();
        this.a(com.inuker.bluetooth.library.b.f.e);
        if (!this.d()) {
            final byte[] byArray = this.c();
            if (!com.inuker.bluetooth.library.e.c.d(byArray)) {
                com.inuker.bluetooth.library.b.a.a a2 = new com.inuker.bluetooth.library.b.a.a(0);
                this.a(a2, new d(){

                    @Override
                    public void a(int n2) {
                        c.this.a(false);
                        c.this.e();
                        if (n2 == 0) {
                            c.this.c(byArray);
                        }
                    }
                });
            } else {
                this.e();
            }
        }
    }

    private void c(byte[] byArray) {
        com.inuker.bluetooth.library.e.a.b(String.format(">>> receive: %s", new String(byArray)));
        com.inuker.bluetooth.library.d.a(new a(byArray));
    }

    private byte[] c() {
        this.a(false);
        if (this.f.size() != this.i) {
            throw new IllegalStateException();
        }
        com.inuker.bluetooth.library.e.a.c(String.format("%s: totalBytes = %d", this.f(), this.h));
        ByteBuffer byteBuffer = ByteBuffer.allocate(this.h);
        for (int i2 = 1; i2 <= this.i; ++i2) {
            com.inuker.bluetooth.library.b.a.c c2 = (com.inuker.bluetooth.library.b.a.c)this.f.get(i2);
            c2.a(byteBuffer);
            if (i2 != this.i || this.a(byteBuffer.array(), c2.f())) continue;
            com.inuker.bluetooth.library.e.a.b(String.format("check crc failed!!", new Object[0]));
            return com.inuker.bluetooth.library.e.c.a;
        }
        return byteBuffer.array();
    }

    private boolean d() {
        int n2;
        this.a(false);
        com.inuker.bluetooth.library.e.a.c(this.f());
        for (n2 = this.m + 1; n2 <= this.i && this.f.get(n2) != null; ++n2) {
        }
        if (n2 <= this.i) {
            this.g = n2;
            com.inuker.bluetooth.library.b.a.a a2 = new com.inuker.bluetooth.library.b.a.a(5, n2);
            this.a(a2, new d(){

                @Override
                public void a(int n2) {
                    c.this.a(false);
                    if (n2 == 0) {
                        c.this.a(com.inuker.bluetooth.library.b.f.f);
                        c.this.g();
                    } else {
                        c.this.e();
                    }
                }
            });
            return true;
        }
        return false;
    }

    private void e() {
        this.a(false);
        com.inuker.bluetooth.library.e.a.c(this.f());
        this.i();
        this.a(com.inuker.bluetooth.library.b.f.a);
        this.e = null;
        this.i = 0;
        this.j = null;
        this.f.clear();
        this.g = 0;
        this.m = 0;
        this.h = 0;
    }

    private void a(final int n2, final boolean bl) {
        this.a(false);
        if (n2 >= this.i) {
            com.inuker.bluetooth.library.e.a.c(String.format("%s: all packets sended!!", this.f()));
            this.a(com.inuker.bluetooth.library.b.f.e);
            this.a(15000L);
            return;
        }
        com.inuker.bluetooth.library.e.a.c(String.format("%s: index = %d, looped = %b", this.f(), n2 + 1, bl));
        int n3 = n2 * 18;
        int n4 = Math.min(this.e.length, (n2 + 1) * 18);
        com.inuker.bluetooth.library.b.a.c c2 = new com.inuker.bluetooth.library.b.a.c(n2 + 1, this.e, n3, n4);
        this.a(c2, new d(){

            @Override
            public void a(int n22) {
                c.this.a(false);
                if (n22 != 0) {
                    com.inuker.bluetooth.library.e.a.e(String.format(">>> packet %d write failed", n2));
                }
                if (bl) {
                    c.this.a(n2 + 1, bl);
                }
            }
        });
    }

    private void a(f f2) {
        this.a(false);
        com.inuker.bluetooth.library.e.a.c(String.format("%s: state = %s", new Object[]{this.f(), f2}));
        this.d = f2;
    }

    private void a(e e2, Object ... objectArray) {
        this.a(false);
        com.inuker.bluetooth.library.e.a.c(String.format("%s: state = %s, event = %s", new Object[]{this.f(), this.d, e2}));
        for (g g2 : this.t) {
            if (g2.a != this.d || g2.b != e2) continue;
            g2.c.a(objectArray);
            break;
        }
    }

    private void a(boolean bl) {
        Looper looper;
        Looper looper2 = looper = bl ? Looper.getMainLooper() : this.k.getLooper();
        if (Looper.myLooper() != looper) {
            throw new RuntimeException();
        }
    }

    private void d(byte[] byArray) {
        this.a(false);
        com.inuker.bluetooth.library.b.a.e e2 = com.inuker.bluetooth.library.b.a.e.a(byArray);
        com.inuker.bluetooth.library.e.a.e(String.format("%s: %s", this.f(), e2));
        switch (e2.a()) {
            case "ack": {
                this.a(com.inuker.bluetooth.library.b.e.e, e2);
                break;
            }
            case "data": {
                this.a(com.inuker.bluetooth.library.b.e.c, e2);
                break;
            }
            case "ctr": {
                this.a(com.inuker.bluetooth.library.b.e.a, e2);
                break;
            }
        }
    }

    private void c(byte[] byArray, d d2) {
        this.a(false);
        if (this.d != com.inuker.bluetooth.library.b.f.a) {
            d2.a(-3);
            return;
        }
        this.d = com.inuker.bluetooth.library.b.f.b;
        this.j = (d)com.inuker.bluetooth.library.e.b.d.a(d2);
        this.h = byArray.length;
        this.i = this.b(this.h);
        com.inuker.bluetooth.library.e.a.c(String.format("%s: totalBytes = %d, frameCount = %d", this.f(), this.h, this.i));
        this.e = Arrays.copyOf(byArray, byArray.length + 2);
        byte[] byArray2 = com.inuker.bluetooth.library.b.a.a(byArray);
        System.arraycopy(byArray2, 0, this.e, byArray.length, 2);
        this.a();
    }

    @Override
    public boolean a(Object object, Method method, Object[] objectArray) {
        this.k.obtainMessage(0, (Object)new com.inuker.bluetooth.library.e.b.a(object, method, objectArray)).sendToTarget();
        return true;
    }

    private String f() {
        return String.format("%s.%s", this.getClass().getSimpleName(), com.inuker.bluetooth.library.d.b());
    }

    private int b(int n2) {
        int n3 = n2 + 2;
        return 1 + (n3 - 1) / 18;
    }

    private void g() {
        this.a(5000L);
    }

    private void h() {
        this.a(5000L, new k.a(c){

            @Override
            public void a() throws TimeoutException {
                throw new TimeoutException();
            }
        });
    }

    private void a(long l2) {
        this.a(l2, this.r);
    }

    private void a(long l2, k.a a2) {
        com.inuker.bluetooth.library.e.a.c(String.format("%s: duration = %d", this.f(), l2));
        com.inuker.bluetooth.library.b.k.a(a2, l2);
    }

    private void i() {
        com.inuker.bluetooth.library.e.a.c(this.f());
        com.inuker.bluetooth.library.b.k.a();
    }

    private boolean j() {
        return com.inuker.bluetooth.library.b.k.b();
    }

    private boolean k() {
        return c.equals(com.inuker.bluetooth.library.b.k.c());
    }

    private boolean a(byte[] byArray, byte[] byArray2) {
        return com.inuker.bluetooth.library.e.c.b(byArray2, com.inuker.bluetooth.library.b.a.a(byArray));
    }

    private class a
    implements Runnable {
        private byte[] b;

        a(byte[] byArray) {
            this.b = byArray;
        }

        @Override
        public void run() {
            c.this.b(this.b);
        }
    }

    private class b
    implements d {
        d a;

        b(d d2) {
            this.a = d2;
        }

        @Override
        public void a(int n2) {
            if (c.this.k()) {
                c.this.i();
            }
            c.this.k.obtainMessage(1, n2, 0, (Object)this.a).sendToTarget();
        }
    }
}

