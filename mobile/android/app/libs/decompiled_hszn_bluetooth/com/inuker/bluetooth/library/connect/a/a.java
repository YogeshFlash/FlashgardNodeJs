/*
 * Decompiled with CFR 0.152.
 * 
 * Could not load the following classes:
 *  android.os.Parcel
 *  android.os.Parcelable
 *  android.os.Parcelable$Creator
 */
package com.inuker.bluetooth.library.connect.a;

import android.os.Parcel;
import android.os.Parcelable;

public class a
implements Parcelable {
    private int b;
    private int c;
    private int d;
    private int e;
    public static final Parcelable.Creator<a> a = new Parcelable.Creator<a>(){

        public a a(Parcel parcel) {
            return new a(parcel);
        }

        public a[] a(int n2) {
            return new a[n2];
        }

        public /* synthetic */ Object[] newArray(int n2) {
            return this.a(n2);
        }

        public /* synthetic */ Object createFromParcel(Parcel parcel) {
            return this.a(parcel);
        }
    };

    public a(a a2) {
        this.b = a2.e;
        this.c = a2.f;
        this.d = a2.g;
        this.e = a2.h;
    }

    protected a(Parcel parcel) {
        this.b = parcel.readInt();
        this.c = parcel.readInt();
        this.d = parcel.readInt();
        this.e = parcel.readInt();
    }

    public int describeContents() {
        return 0;
    }

    public void writeToParcel(Parcel parcel, int n2) {
        parcel.writeInt(this.b);
        parcel.writeInt(this.c);
        parcel.writeInt(this.d);
        parcel.writeInt(this.e);
    }

    public int a() {
        return this.b;
    }

    public void a(int n2) {
        this.b = n2;
    }

    public int b() {
        return this.c;
    }

    public void b(int n2) {
        this.c = n2;
    }

    public int c() {
        return this.d;
    }

    public void c(int n2) {
        this.d = n2;
    }

    public int d() {
        return this.e;
    }

    public void d(int n2) {
        this.e = n2;
    }

    public String toString() {
        return "BleConnectOptions{connectRetry=" + this.b + ", serviceDiscoverRetry=" + this.c + ", connectTimeout=" + this.d + ", serviceDiscoverTimeout=" + this.e + '}';
    }

    public static class a {
        private static final int a = 0;
        private static final int b = 0;
        private static final int c = 30000;
        private static final int d = 30000;
        private int e = 0;
        private int f = 0;
        private int g = 30000;
        private int h = 30000;

        public a a(int n2) {
            this.e = n2;
            return this;
        }

        public a b(int n2) {
            this.f = n2;
            return this;
        }

        public a c(int n2) {
            this.g = n2;
            return this;
        }

        public a d(int n2) {
            this.h = n2;
            return this;
        }

        public a a() {
            return new a(this);
        }
    }
}

