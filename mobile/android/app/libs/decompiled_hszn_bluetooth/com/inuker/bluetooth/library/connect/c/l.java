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
package com.inuker.bluetooth.library.connect.c;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.os.RemoteException;
import com.inuker.bluetooth.library.l;

public abstract class l
extends l.b
implements Handler.Callback {
    private static final int a = 1;
    private Handler b;

    protected abstract void a(int var1, Bundle var2);

    protected l() {
        if (Looper.myLooper() == null) {
            throw new RuntimeException();
        }
        this.b = new Handler(Looper.myLooper(), (Handler.Callback)this);
    }

    @Override
    public void b(int n2, Bundle bundle) throws RemoteException {
        this.b.obtainMessage(1, n2, 0, (Object)bundle).sendToTarget();
    }

    public boolean handleMessage(Message message) {
        switch (message.what) {
            case 1: {
                this.a(message.arg1, (Bundle)message.obj);
            }
        }
        return true;
    }
}

