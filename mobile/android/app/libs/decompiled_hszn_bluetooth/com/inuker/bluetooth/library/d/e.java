/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.content.BroadcastReceiver
 *  android.content.Context
 *  android.content.Intent
 *  android.content.IntentFilter
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 *  android.text.TextUtils
 */
package com.inuker.bluetooth.library.d;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.text.TextUtils;
import com.inuker.bluetooth.library.d.a;
import com.inuker.bluetooth.library.d.a.g;
import com.inuker.bluetooth.library.d.b;
import com.inuker.bluetooth.library.d.c;
import com.inuker.bluetooth.library.d.d;
import com.inuker.bluetooth.library.d.f;
import com.inuker.bluetooth.library.d.h;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class e
extends BroadcastReceiver
implements Handler.Callback,
com.inuker.bluetooth.library.d.g {
    private static final int a = 1;
    private Map<String, List<g>> b;
    private static com.inuker.bluetooth.library.d.g c;
    private Handler d;
    private h e = new h(){

        @Override
        public List<g> a(Class<?> clazz) {
            return (List)e.this.b.get(clazz.getSimpleName());
        }
    };
    private a[] f = new a[]{com.inuker.bluetooth.library.d.f.a(this.e), com.inuker.bluetooth.library.d.d.a(this.e), com.inuker.bluetooth.library.d.c.a(this.e), com.inuker.bluetooth.library.d.b.a(this.e)};

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    public static com.inuker.bluetooth.library.d.g a() {
        if (c != null) return c;
        Class<e> clazz = e.class;
        synchronized (e.class) {
            if (c != null) return c;
            c = new e();
            // ** MonitorExit[var0] (shouldn't be in output)
            return c;
        }
    }

    private e() {
        this.b = new HashMap<String, List<g>>();
        this.d = new Handler(Looper.getMainLooper(), (Handler.Callback)this);
        com.inuker.bluetooth.library.e.b.a(this, this.b());
    }

    private IntentFilter b() {
        IntentFilter intentFilter = new IntentFilter();
        for (a a2 : this.f) {
            List<String> list = a2.a();
            for (String string : list) {
                intentFilter.addAction(string);
            }
        }
        return intentFilter;
    }

    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }
        String string = intent.getAction();
        if (TextUtils.isEmpty((CharSequence)string)) {
            return;
        }
        com.inuker.bluetooth.library.e.a.c(String.format("BluetoothReceiver onReceive: %s", string));
        for (a a2 : this.f) {
            if (!a2.a(string) || !a2.a(context, intent)) continue;
            return;
        }
    }

    @Override
    public void a(g g2) {
        this.d.obtainMessage(1, (Object)g2).sendToTarget();
    }

    private void b(g g2) {
        if (g2 != null) {
            List<g> list = this.b.get(g2.a());
            if (list == null) {
                list = new LinkedList<g>();
                this.b.put(g2.a(), list);
            }
            list.add(g2);
        }
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 1: {
                this.b((g)message.obj);
            }
        }
        return true;
    }
}

