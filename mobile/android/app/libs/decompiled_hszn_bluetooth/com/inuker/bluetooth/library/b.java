/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.ComponentName
 *  android.content.Context
 *  android.content.Intent
 *  android.content.ServiceConnection
 *  android.os.Bundle
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.HandlerThread
 *  android.os.IBinder
 *  android.os.Looper
 *  android.os.Message
 *  android.os.Parcelable
 */
package com.inuker.bluetooth.library;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.Message;
import android.os.Parcelable;
import com.inuker.bluetooth.library.c.c;
import com.inuker.bluetooth.library.connect.c.f;
import com.inuker.bluetooth.library.connect.c.i;
import com.inuker.bluetooth.library.connect.c.j;
import com.inuker.bluetooth.library.connect.c.l;
import com.inuker.bluetooth.library.connect.listener.BluetoothStateListener;
import com.inuker.bluetooth.library.d.a.d;
import com.inuker.bluetooth.library.d.a.e;
import com.inuker.bluetooth.library.d.a.h;
import com.inuker.bluetooth.library.e.b.a;
import com.inuker.bluetooth.library.k;
import com.inuker.bluetooth.library.search.SearchResult;
import com.inuker.bluetooth.library.search.g;
import java.io.Serializable;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;

public class b
implements Handler.Callback,
com.inuker.bluetooth.library.e.b.b,
com.inuker.bluetooth.library.j {
    private static final int a = 1;
    private static final int b = 2;
    private static final String c = b.class.getSimpleName();
    private Context d;
    private volatile k e;
    private static volatile com.inuker.bluetooth.library.j f;
    private CountDownLatch g;
    private HandlerThread h;
    private Handler i;
    private HashMap<String, HashMap<String, List<com.inuker.bluetooth.library.connect.c.d>>> j;
    private HashMap<String, List<com.inuker.bluetooth.library.connect.listener.a>> k;
    private List<BluetoothStateListener> l;
    private List<d> m;
    private final ServiceConnection n = new ServiceConnection(){

        public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
            b.this.e = k.b.a(iBinder);
            b.this.d();
        }

        public void onServiceDisconnected(ComponentName componentName) {
            b.this.e = null;
        }
    };

    private b(Context context) {
        this.d = context.getApplicationContext();
        com.inuker.bluetooth.library.d.a(this.d);
        this.h = new HandlerThread(c);
        this.h.start();
        this.i = new Handler(this.h.getLooper(), (Handler.Callback)this);
        this.j = new HashMap();
        this.k = new HashMap();
        this.l = new LinkedList<BluetoothStateListener>();
        this.m = new LinkedList<d>();
        this.i.obtainMessage(2).sendToTarget();
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    public static com.inuker.bluetooth.library.j a(Context context) {
        if (f != null) return f;
        Class<b> clazz = b.class;
        synchronized (b.class) {
            if (f != null) return f;
            b b2 = new b(context);
            f = (com.inuker.bluetooth.library.j)com.inuker.bluetooth.library.e.b.d.a((Object)b2, com.inuker.bluetooth.library.j.class, (com.inuker.bluetooth.library.e.b.b)b2);
            // ** MonitorExit[var1_1] (shouldn't be in output)
            return f;
        }
    }

    private k b() {
        if (this.e == null) {
            this.c();
        }
        return this.e;
    }

    private void c() {
        this.a(true);
        this.g = new CountDownLatch(1);
        Intent intent = new Intent();
        intent.setClass(this.d, com.inuker.bluetooth.library.e.class);
        if (this.d.bindService(intent, this.n, 1)) {
            this.e();
        } else {
            this.e = com.inuker.bluetooth.library.f.a();
        }
    }

    @Override
    public void a(String string, com.inuker.bluetooth.library.connect.a.a a2, final com.inuker.bluetooth.library.connect.c.a a3) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putParcelable("extra.options", (Parcelable)a2);
        this.a(1, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (a3 != null) {
                    bundle.setClassLoader(this.getClass().getClassLoader());
                    c c2 = (c)bundle.getParcelable("extra.gatt.profile");
                    a3.a(n2, c2);
                }
            }
        });
    }

    @Override
    public void a(String string) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        this.a(2, bundle, null);
        this.b(string);
    }

    @Override
    public void a(String string, com.inuker.bluetooth.library.connect.listener.a a2) {
        this.a(true);
        List<com.inuker.bluetooth.library.connect.listener.a> list = this.k.get(string);
        if (list == null) {
            list = new ArrayList<com.inuker.bluetooth.library.connect.listener.a>();
            this.k.put(string, list);
        }
        if (a2 != null && !list.contains(a2)) {
            list.add(a2);
        }
    }

    @Override
    public void b(String string, com.inuker.bluetooth.library.connect.listener.a a2) {
        this.a(true);
        List<com.inuker.bluetooth.library.connect.listener.a> list = this.k.get(string);
        if (a2 != null && !com.inuker.bluetooth.library.e.d.a(list)) {
            list.remove(a2);
        }
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, final com.inuker.bluetooth.library.connect.c.e e2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        this.a(3, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (e2 != null) {
                    e2.a(n2, bundle.getByteArray("extra.byte.value"));
                }
            }
        });
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, byte[] byArray, final j j2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        bundle.putByteArray("extra.byte.value", byArray);
        this.a(4, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (j2 != null) {
                    j2.a(n2);
                }
            }
        });
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, UUID uUID3, final com.inuker.bluetooth.library.connect.c.e e2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        bundle.putSerializable("extra.descriptor.uuid", (Serializable)uUID3);
        this.a(13, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (e2 != null) {
                    e2.a(n2, bundle.getByteArray("extra.byte.value"));
                }
            }
        });
    }

    @Override
    public void a(String string, UUID uUID, UUID uUID2, UUID uUID3, byte[] byArray, final j j2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        bundle.putSerializable("extra.descriptor.uuid", (Serializable)uUID3);
        bundle.putByteArray("extra.byte.value", byArray);
        this.a(14, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (j2 != null) {
                    j2.a(n2);
                }
            }
        });
    }

    @Override
    public void b(String string, UUID uUID, UUID uUID2, byte[] byArray, final j j2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        bundle.putByteArray("extra.byte.value", byArray);
        this.a(5, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (j2 != null) {
                    j2.a(n2);
                }
            }
        });
    }

    private void c(String string, UUID uUID, UUID uUID2, com.inuker.bluetooth.library.connect.c.d d2) {
        String string2;
        List<com.inuker.bluetooth.library.connect.c.d> list;
        this.a(true);
        HashMap<String, List<com.inuker.bluetooth.library.connect.c.d>> hashMap = this.j.get(string);
        if (hashMap == null) {
            hashMap = new HashMap();
            this.j.put(string, hashMap);
        }
        if ((list = hashMap.get(string2 = this.a(uUID, uUID2))) == null) {
            list = new ArrayList<com.inuker.bluetooth.library.connect.c.d>();
            hashMap.put(string2, list);
        }
        list.add(d2);
    }

    private void a(String string, UUID uUID, UUID uUID2) {
        this.a(true);
        HashMap<String, List<com.inuker.bluetooth.library.connect.c.d>> hashMap = this.j.get(string);
        if (hashMap != null) {
            String string2 = this.a(uUID, uUID2);
            hashMap.remove(string2);
        }
    }

    private void b(String string) {
        this.a(true);
        this.j.remove(string);
    }

    private String a(UUID uUID, UUID uUID2) {
        return String.format("%s_%s", uUID, uUID2);
    }

    @Override
    public void a(final String string, final UUID uUID, final UUID uUID2, final com.inuker.bluetooth.library.connect.c.d d2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        this.a(6, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (d2 != null) {
                    if (n2 == 0) {
                        b.this.c(string, uUID, uUID2, d2);
                    }
                    d2.a(n2);
                }
            }
        });
    }

    @Override
    public void a(final String string, final UUID uUID, final UUID uUID2, final i i2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        this.a(7, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                b.this.a(string, uUID, uUID2);
                if (i2 != null) {
                    i2.a(n2);
                }
            }
        });
    }

    @Override
    public void b(final String string, final UUID uUID, final UUID uUID2, final com.inuker.bluetooth.library.connect.c.d d2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putSerializable("extra.service.uuid", (Serializable)uUID);
        bundle.putSerializable("extra.character.uuid", (Serializable)uUID2);
        this.a(10, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (d2 != null) {
                    if (n2 == 0) {
                        b.this.c(string, uUID, uUID2, d2);
                    }
                    d2.a(n2);
                }
            }
        });
    }

    @Override
    public void b(String string, UUID uUID, UUID uUID2, i i2) {
        this.a(string, uUID, uUID2, i2);
    }

    @Override
    public void a(String string, final f f2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        this.a(8, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (f2 != null) {
                    f2.a(n2, bundle.getInt("extra.rssi", 0));
                }
            }
        });
    }

    @Override
    public void a(String string, int n2, final com.inuker.bluetooth.library.connect.c.c c2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putInt("extra.mtu", n2);
        this.a(22, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (c2 != null) {
                    c2.a(n2, bundle.getInt("extra.mtu", 23));
                }
            }
        });
    }

    @Override
    public void a(g g2, final com.inuker.bluetooth.library.search.c.b b2) {
        Bundle bundle = new Bundle();
        bundle.putParcelable("extra.request", (Parcelable)g2);
        this.a(11, bundle, new l(){

            @Override
            protected void a(int n2, Bundle bundle) {
                b.this.a(true);
                if (b2 == null) {
                    return;
                }
                bundle.setClassLoader(this.getClass().getClassLoader());
                switch (n2) {
                    case 1: {
                        b2.a();
                        break;
                    }
                    case 3: {
                        b2.c();
                        break;
                    }
                    case 2: {
                        b2.b();
                        break;
                    }
                    case 4: {
                        SearchResult searchResult = (SearchResult)bundle.getParcelable("extra.search.result");
                        b2.a(searchResult);
                        break;
                    }
                    default: {
                        throw new IllegalStateException("unknown code");
                    }
                }
            }
        });
    }

    @Override
    public void a() {
        this.a(12, (Bundle)null, (l)null);
    }

    @Override
    public void a(BluetoothStateListener bluetoothStateListener) {
        this.a(true);
        if (bluetoothStateListener != null && !this.l.contains(bluetoothStateListener)) {
            this.l.add(bluetoothStateListener);
        }
    }

    @Override
    public void b(BluetoothStateListener bluetoothStateListener) {
        this.a(true);
        if (bluetoothStateListener != null) {
            this.l.remove(bluetoothStateListener);
        }
    }

    @Override
    public void a(d d2) {
        this.a(true);
        if (d2 != null && !this.m.contains(d2)) {
            this.m.add(d2);
        }
    }

    @Override
    public void b(d d2) {
        this.a(true);
        if (d2 != null) {
            this.m.remove(d2);
        }
    }

    @Override
    public void a(String string, int n2) {
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        bundle.putInt("extra.type", n2);
        this.a(20, bundle, null);
    }

    @Override
    public void d(String string) {
        this.a(true);
        Bundle bundle = new Bundle();
        bundle.putString("extra.mac", string);
        this.a(21, bundle, null);
    }

    private void a(int n2, Bundle bundle, l l2) {
        this.a(true);
        try {
            k k2 = this.b();
            if (k2 != null) {
                bundle = bundle != null ? bundle : new Bundle();
                k2.a(n2, bundle, l2);
            } else {
                l2.b(-6, null);
            }
        }
        catch (Throwable throwable) {
            com.inuker.bluetooth.library.e.a.a(throwable);
        }
    }

    @Override
    public boolean a(Object object, Method method, Object[] objectArray) {
        this.i.obtainMessage(1, (Object)new a(object, method, objectArray)).sendToTarget();
        return true;
    }

    private void d() {
        if (this.g != null) {
            this.g.countDown();
            this.g = null;
        }
    }

    private void e() {
        try {
            this.g.await();
        }
        catch (InterruptedException interruptedException) {
            interruptedException.printStackTrace();
        }
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 1: {
                com.inuker.bluetooth.library.e.b.a.a(message.obj);
                break;
            }
            case 2: {
                this.f();
            }
        }
        return true;
    }

    private void f() {
        this.a(true);
        com.inuker.bluetooth.library.d.e.a().a(new h(){

            @Override
            protected void a(int n2, int n3) {
                b.this.a(true);
                b.this.a(n3);
            }
        });
        com.inuker.bluetooth.library.d.e.a().a(new e(){

            @Override
            protected void a(String string, int n2) {
                b.this.a(true);
                b.this.c(string, n2);
            }
        });
        com.inuker.bluetooth.library.d.e.a().a(new com.inuker.bluetooth.library.d.a.c(){

            @Override
            protected void a(String string, int n2) {
                b.this.a(true);
                if (n2 == 32) {
                    b.this.b(string);
                }
                b.this.b(string, n2);
            }
        });
        com.inuker.bluetooth.library.d.e.a().a(new com.inuker.bluetooth.library.d.a.b(){

            @Override
            public void a(String string, UUID uUID, UUID uUID2, byte[] byArray) {
                b.this.a(true);
                b.this.a(string, uUID, uUID2, byArray);
            }
        });
    }

    private void a(String string, UUID uUID, UUID uUID2, byte[] byArray) {
        String string2;
        List<com.inuker.bluetooth.library.connect.c.d> list;
        this.a(true);
        HashMap<String, List<com.inuker.bluetooth.library.connect.c.d>> hashMap = this.j.get(string);
        if (hashMap != null && (list = hashMap.get(string2 = this.a(uUID, uUID2))) != null) {
            for (com.inuker.bluetooth.library.connect.c.d d2 : list) {
                d2.a(uUID, uUID2, byArray);
            }
        }
    }

    private void b(String string, int n2) {
        this.a(true);
        List<com.inuker.bluetooth.library.connect.listener.a> list = this.k.get(string);
        if (!com.inuker.bluetooth.library.e.d.a(list)) {
            for (com.inuker.bluetooth.library.connect.listener.a a2 : list) {
                a2.invokeSync(string, n2);
            }
        }
    }

    private void a(int n2) {
        this.a(true);
        if (n2 == 10 || n2 == 12) {
            for (BluetoothStateListener bluetoothStateListener : this.l) {
                bluetoothStateListener.invokeSync(n2 == 12);
            }
        }
    }

    private void c(String string, int n2) {
        this.a(true);
        for (d d2 : this.m) {
            d2.invokeSync(string, n2);
        }
    }

    private void a(boolean bl) {
        Looper looper;
        Looper looper2 = looper = bl ? this.i.getLooper() : Looper.getMainLooper();
        if (Looper.myLooper() != looper) {
            throw new RuntimeException();
        }
    }
}

