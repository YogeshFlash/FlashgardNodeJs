/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.IBinder
 */
package com.inuker.bluetooth.library.e.a;

import android.os.IBinder;
import com.inuker.bluetooth.library.e.a.a.a;
import com.inuker.bluetooth.library.e.a.c;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.HashMap;

public class b {
    private static final String a = "bluetooth_manager";

    public static void a() {
        Method method = com.inuker.bluetooth.library.e.a.a.a.d();
        IBinder iBinder = (IBinder)com.inuker.bluetooth.library.e.a.b.b.a(method, null, a);
        IBinder iBinder2 = (IBinder)Proxy.newProxyInstance(iBinder.getClass().getClassLoader(), new Class[]{IBinder.class}, (InvocationHandler)new c(iBinder));
        HashMap<String, IBinder> hashMap = com.inuker.bluetooth.library.e.a.a.a.c();
        hashMap.put(a, iBinder2);
    }
}

