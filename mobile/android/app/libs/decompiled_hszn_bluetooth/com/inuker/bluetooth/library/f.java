/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Bundle
 *  android.os.Handler
 *  android.os.Handler$Callback
 *  android.os.Looper
 *  android.os.Message
 *  android.os.RemoteException
 */
package com.inuker.bluetooth.library;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.RemoteException;
import com.inuker.bluetooth.library.connect.a.a;
import com.inuker.bluetooth.library.connect.c.b;
import com.inuker.bluetooth.library.k;
import com.inuker.bluetooth.library.l;
import com.inuker.bluetooth.library.search.g;
import java.util.UUID;

public class f
extends k.b
implements Handler.Callback {
    private static f b;
    private Handler c = new Handler(Looper.getMainLooper(), (Handler.Callback)this);

    private f() {
    }

    /*
     * WARNING - Removed try catching itself - possible behaviour change.
     * Enabled force condition propagation
     * Lifted jumps to return sites
     */
    public static f a() {
        if (b != null) return b;
        Class<f> clazz = f.class;
        synchronized (f.class) {
            if (b != null) return b;
            b = new f();
            // ** MonitorExit[var0] (shouldn't be in output)
            return b;
        }
    }

    @Override
    public void a(int n2, Bundle bundle, final l l2) throws RemoteException {
        Message message = this.c.obtainMessage(n2, (Object)new b(){

            @Override
            public void a(int n2, Bundle bundle) {
                if (l2 != null) {
                    if (bundle == null) {
                        bundle = new Bundle();
                    }
                    try {
                        l2.b(n2, bundle);
                    }
                    catch (Throwable throwable) {
                        com.inuker.bluetooth.library.e.a.a(throwable);
                    }
                }
            }
        });
        bundle.setClassLoader(this.getClass().getClassLoader());
        message.setData(bundle);
        message.sendToTarget();
    }

    public boolean handleMessage(Message message) {
        Bundle bundle = message.getData();
        String string = bundle.getString("extra.mac");
        UUID uUID = (UUID)bundle.getSerializable("extra.service.uuid");
        UUID uUID2 = (UUID)bundle.getSerializable("extra.character.uuid");
        UUID uUID3 = (UUID)bundle.getSerializable("extra.descriptor.uuid");
        byte[] byArray = bundle.getByteArray("extra.byte.value");
        b b2 = (b)message.obj;
        switch (message.what) {
            case 1: {
                a a2 = (a)bundle.getParcelable("extra.options");
                com.inuker.bluetooth.library.connect.b.a(string, a2, b2);
                break;
            }
            case 2: {
                com.inuker.bluetooth.library.connect.b.a(string);
                break;
            }
            case 3: {
                com.inuker.bluetooth.library.connect.b.a(string, uUID, uUID2, b2);
                break;
            }
            case 4: {
                com.inuker.bluetooth.library.connect.b.a(string, uUID, uUID2, byArray, b2);
                break;
            }
            case 5: {
                com.inuker.bluetooth.library.connect.b.b(string, uUID, uUID2, byArray, b2);
                break;
            }
            case 13: {
                com.inuker.bluetooth.library.connect.b.a(string, uUID, uUID2, uUID3, b2);
                break;
            }
            case 14: {
                com.inuker.bluetooth.library.connect.b.a(string, uUID, uUID2, uUID3, byArray, b2);
                break;
            }
            case 6: {
                com.inuker.bluetooth.library.connect.b.b(string, uUID, uUID2, b2);
                break;
            }
            case 7: {
                com.inuker.bluetooth.library.connect.b.c(string, uUID, uUID2, b2);
                break;
            }
            case 8: {
                com.inuker.bluetooth.library.connect.b.a(string, b2);
                break;
            }
            case 11: {
                g g2 = (g)bundle.getParcelable("extra.request");
                com.inuker.bluetooth.library.search.b.a(g2, b2);
                break;
            }
            case 12: {
                com.inuker.bluetooth.library.search.b.a();
                break;
            }
            case 10: {
                com.inuker.bluetooth.library.connect.b.d(string, uUID, uUID2, b2);
                break;
            }
            case 22: {
                int n2 = bundle.getInt("extra.mtu");
                com.inuker.bluetooth.library.connect.b.a(string, n2, b2);
                break;
            }
            case 20: {
                int n3 = bundle.getInt("extra.type", 0);
                com.inuker.bluetooth.library.connect.b.a(string, n3);
                break;
            }
            case 21: {
                com.inuker.bluetooth.library.connect.b.b(string);
            }
        }
        return true;
    }
}

